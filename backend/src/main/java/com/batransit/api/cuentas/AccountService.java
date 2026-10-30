package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.Favorites;
import com.batransit.api.cuentas.AccountModels.Places;
import com.batransit.api.cuentas.AccountModels.SessionResponse;
import com.batransit.api.cuentas.AccountModels.UserImage;
import com.batransit.api.cuentas.AccountModels.UserView;
import com.batransit.api.cuentas.GoogleTokenVerifier.GoogleIdentity;
import com.batransit.api.cuentas.TokenService.Claims;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Cuentas: crear, ingresar (mail y contrasena o Google), ver, guardar los
 * favoritos y borrar la cuenta. Los mensajes de error van tal cual al sitio.
 */
@Service
public class AccountService {

    static final int MIN_PASSWORD = 8;
    static final int MAX_PASSWORD = 200;
    static final int MAX_FAVORITES = 50;
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]{1,64}@[^@\\s]+\\.[^@\\s]{2,}$");
    private static final Pattern ACCESS_ID = Pattern.compile("^[a-z0-9-]{1,40}$");
    /** Cartel de un colectivo: "152", "53A", "8C". */
    private static final Pattern BUS_LINE = Pattern.compile("^[0-9A-Z]{1,8}$");
    /** Para que "mail inexistente" tarde lo mismo que "contrasena incorrecta". */
    private static final String DUMMY_HASH = PasswordHasher.hash("contraseña de relleno");

    private final AppUserRepository users;
    private final TokenService tokens;
    private final GoogleTokenVerifier google;
    private final ObjectMapper mapper;

    public AccountService(AppUserRepository users, TokenService tokens, GoogleTokenVerifier google, ObjectMapper mapper) {
        this.users = users;
        this.tokens = tokens;
        this.google = google;
        this.mapper = mapper;
    }

    @Transactional
    public SessionResponse register(String rawEmail, String password, String rawName) {
        String email = normalizeEmail(rawEmail);
        checkPassword(password);
        users.findByEmail(email).ifPresent(existing -> {
            throw new AccountException(HttpStatus.CONFLICT, existing.getPasswordHash() == null
                    ? "Ya hay una cuenta con ese mail que entra con Google: usá \"Continuar con Google\"."
                    : "Ya hay una cuenta con ese mail: ingresá con tu contraseña.");
        });
        AppUser user = new AppUser(email, cleanName(rawName));
        user.setPasswordHash(PasswordHasher.hash(password));
        user.setLastLoginAt(Instant.now());
        try {
            user = users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new AccountException(HttpStatus.CONFLICT, "Ya hay una cuenta con ese mail: ingresá con tu contraseña.");
        }
        return session(user);
    }

    @Transactional
    public SessionResponse login(String rawEmail, String password) {
        String email = rawEmail == null ? "" : rawEmail.strip().toLowerCase(Locale.ROOT);
        AppUser user = users.findByEmail(email).orElse(null);
        String hash = user == null || user.getPasswordHash() == null ? DUMMY_HASH : user.getPasswordHash();
        boolean ok = PasswordHasher.matches(password, hash) && user != null && user.getPasswordHash() != null;
        if (!ok) {
            throw new AccountException(HttpStatus.UNAUTHORIZED, "El mail o la contraseña no son correctos.");
        }
        user.setLastLoginAt(Instant.now());
        return session(user);
    }

    /** Con Google: si ya hay una cuenta con ese mail, se le suma Google; si no, se crea. */
    @Transactional
    public SessionResponse loginWithGoogle(String credential) {
        if (!google.isConfigured()) {
            throw new AccountException(HttpStatus.SERVICE_UNAVAILABLE, "El ingreso con Google no está disponible por el momento.");
        }
        GoogleIdentity identity = google.verify(credential)
                .orElseThrow(() -> new AccountException(HttpStatus.UNAUTHORIZED, "No se pudo confirmar tu cuenta de Google. Probá de nuevo."));
        AppUser user = users.findByGoogleSub(identity.sub())
                .or(() -> users.findByEmail(identity.email()))
                .orElseGet(() -> new AppUser(identity.email(), cleanName(identity.name())));
        if (user.getGoogleSub() == null) {
            user.setGoogleSub(identity.sub());
        }
        if (user.getDisplayName() == null) {
            user.setDisplayName(cleanName(identity.name()));
        }
        if (identity.picture() != null) {
            user.setGooglePicture(identity.picture());
            if (user.getAvatarKind() == null) {
                user.setAvatar("google", null); // de entrada, la foto de Google
            }
        }
        user.setLastLoginAt(Instant.now());
        return session(users.saveAndFlush(user));
    }

    @Transactional(readOnly = true)
    public UserView me(Claims session) {
        return view(find(session));
    }

    @Transactional(readOnly = true)
    public Favorites favorites(Claims session) {
        return readFavorites(find(session).getFavorites());
    }

    /** Cambia el nombre de la cuenta. */
    @Transactional
    public UserView rename(Claims session, String rawName) {
        String name = cleanName(rawName);
        if (name == null) {
            throw bad("Escribí tu nombre.");
        }
        AppUser user = find(session);
        user.setDisplayName(name);
        return view(user);
    }

    /**
     * Agrega o cambia la contraseña. Si la cuenta ya tenia, hay que dar la
     * actual. Cierra las demas sesiones y devuelve una nueva para este dispositivo.
     */
    @Transactional
    public SessionResponse changePassword(Claims session, String current, String password) {
        AppUser user = find(session);
        if (user.getPasswordHash() != null && (current == null || !PasswordHasher.matches(current, user.getPasswordHash()))) {
            throw bad("La contraseña actual no es correcta.");
        }
        checkPassword(password);
        user.setPasswordHash(PasswordHasher.hash(password));
        return closeOthers(user);
    }

    /** Cierra la sesion en todos los demas dispositivos; este sigue con una sesion nueva. */
    @Transactional
    public SessionResponse closeOtherSessions(Claims session) {
        return closeOthers(find(session));
    }

    private SessionResponse closeOthers(AppUser user) {
        // Las sesiones guardan el segundo en que se crearon: la nueva, del mismo segundo, sigue valiendo.
        user.setSessionsValidAfter(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS));
        return session(user);
    }

    @Transactional(readOnly = true)
    public Preferences.Prefs preferences(Claims session) {
        return readPreferences(find(session).getPreferences());
    }

    @Transactional
    public Preferences.Prefs savePreferences(Claims session, Preferences.Prefs prefs) {
        AppUser user = find(session);
        Preferences.Prefs clean = Preferences.sanitize(prefs);
        try {
            user.setPreferences(mapper.writeValueAsString(clean), Instant.now());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        return clean;
    }

    Preferences.Prefs readPreferences(String json) {
        try {
            return Preferences.sanitize(mapper.readValue(json == null || json.isBlank() ? "{}" : json, Preferences.Prefs.class));
        } catch (JsonProcessingException e) {
            return Preferences.Prefs.empty();
        }
    }

    /**
     * Todo lo que la cuenta guarda, para descargar (derecho de acceso). La
     * foto propia va como data URL; los avisos los suma AccountDataExport.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> exportData(Claims session) {
        AppUser user = find(session);
        java.util.Map<String, Object> account = new java.util.LinkedHashMap<>();
        account.put("id", user.getId());
        account.put("mail", user.getEmail());
        account.put("nombre", user.getDisplayName());
        account.put("entraConContrasena", user.getPasswordHash() != null);
        account.put("entraConGoogle", user.getGoogleSub() != null);
        account.put("creada", user.getCreatedAt());
        account.put("ultimoIngreso", user.getLastLoginAt());
        UserImage image = image(user);
        account.put("imagen", image);
        java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("cuenta", account);
        out.put("favoritos", readFavorites(user.getFavorites()));
        out.put("lugares", readPlaces(user.getPlaces()).lugares());
        out.put("preferencias", readPreferences(user.getPreferences()));
        return out;
    }

    @Transactional(readOnly = true)
    public Places places(Claims session) {
        return readPlaces(find(session).getPlaces());
    }

    @Transactional
    public Places savePlaces(Claims session, Places places) {
        AppUser user = find(session);
        Places clean = SavedPlaces.sanitize(places);
        try {
            user.setPlaces(mapper.writeValueAsString(clean), Instant.now());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        return clean;
    }

    @Transactional
    public Favorites saveFavorites(Claims session, Favorites favorites) {
        AppUser user = find(session);
        Favorites clean = sanitize(favorites);
        try {
            user.setFavorites(mapper.writeValueAsString(clean), Instant.now());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        return clean;
    }

    @Transactional
    public void delete(Claims session) {
        users.delete(find(session));
    }

    /** La cuenta de la sesion; si se borro o la sesion es anterior a un cambio de contrasena, 401. */
    private AppUser find(Claims session) {
        AppUser user = users.findById(session.userId()).orElseThrow(AccountException::unauthorized);
        Instant validAfter = user.getSessionsValidAfter();
        if (validAfter != null && session.issuedAt().getEpochSecond() < validAfter.getEpochSecond()) {
            throw AccountException.unauthorized();
        }
        return user;
    }

    SessionResponse session(AppUser user) {
        return new SessionResponse(tokens.issue(user.getId()), view(user));
    }

    static UserView view(AppUser user) {
        return new UserView(user.getId(), user.getEmail(), user.getDisplayName(), user.getPasswordHash() != null,
                user.getGoogleSub() != null, user.getCreatedAt(), image(user));
    }

    static UserImage image(AppUser user) {
        String kind = user.getAvatarKind();
        boolean google = user.getGooglePicture() != null;
        if ("google".equals(kind) && google) {
            return new UserImage("google", null, user.getGooglePicture(), true);
        }
        if ("foto".equals(kind) && user.getPhoto() != null) {
            String url = "data:" + user.getPhotoType() + ";base64," + java.util.Base64.getEncoder().encodeToString(user.getPhoto());
            return new UserImage("foto", null, url, google);
        }
        if ("avatar".equals(kind) && user.getAvatarValue() != null) {
            return new UserImage("avatar", user.getAvatarValue(), null, google);
        }
        return new UserImage(null, null, null, google);
    }

    /** Avatares del sitio: las lineas, el colectivo, la bici y el avion. */
    /** Los avatares del sitio (frontend/src/data/avatarArt.js): Buenos Aires, fauna argentina y patrones. */
    static final Set<String> AVATARS = Set.of(
            "obelisco", "mate", "farol", "bandoneon", "jacaranda", "puente", "sol-de-mayo", "fileteado",
            "carpincho", "hornero", "yaguarete", "pinguino", "zorro", "ballena", "buho", "tortuga",
            "chevrones", "rayas", "ondas", "puntos", "cuadros", "sol", "montanas", "grilla");
    /** La foto ya llega achicada (256 px); esto deja margen y frena archivos grandes. */
    static final int MAX_PHOTO_BYTES = 150_000;

    @Transactional
    public UserView setImage(Claims session, String kind, String value) {
        AppUser user = find(session);
        if (kind == null || kind.isBlank()) {
            user.setAvatar(null, null);
        } else if ("avatar".equals(kind)) {
            if (value == null || !AVATARS.contains(value)) {
                throw bad("Ese avatar no existe.");
            }
            user.setAvatar("avatar", value);
        } else if ("google".equals(kind)) {
            if (user.getGooglePicture() == null) {
                throw bad("Tu cuenta no tiene foto de Google: entrá con Google para usarla.");
            }
            user.setAvatar("google", null);
        } else if ("foto".equals(kind)) {
            if (user.getPhoto() == null) {
                throw bad("Primero subí una foto.");
            }
            user.setAvatar("foto", null);
        } else {
            throw bad("Ese tipo de imagen no existe.");
        }
        return view(user);
    }

    /** Guarda la foto propia (JPEG, PNG o WebP; ya recortada y achicada en el navegador) y la elige. */
    @Transactional
    public UserView setPhoto(Claims session, String dataUrl) {
        AppUser user = find(session);
        Matcher m = dataUrl == null ? null : DATA_URL.matcher(dataUrl);
        if (m == null || !m.matches()) {
            throw bad("La foto no es válida. Probá con una imagen JPG o PNG.");
        }
        byte[] bytes;
        try {
            bytes = java.util.Base64.getDecoder().decode(m.group(2));
        } catch (IllegalArgumentException e) {
            throw bad("La foto no es válida. Probá con una imagen JPG o PNG.");
        }
        if (bytes.length > MAX_PHOTO_BYTES) {
            throw bad("La foto es demasiado grande.");
        }
        String type = imageType(bytes);
        if (type == null) {
            throw bad("La foto no es válida. Probá con una imagen JPG o PNG.");
        }
        user.setPhoto(bytes, type);
        user.setAvatar("foto", null);
        return view(user);
    }

    private static final Pattern DATA_URL = Pattern.compile("^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$");

    /** El tipo real por los primeros bytes (no por lo que dice el navegador). */
    static String imageType(byte[] b) {
        if (b.length > 3 && (b[0] & 0xff) == 0xFF && (b[1] & 0xff) == 0xD8 && (b[2] & 0xff) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length > 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "image/png";
        }
        if (b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    Places readPlaces(String json) {
        try {
            return SavedPlaces.sanitize(mapper.readValue(json == null || json.isBlank() ? "{}" : json, Places.class));
        } catch (JsonProcessingException e) {
            return Places.empty();
        }
    }

    Favorites readFavorites(String json) {
        try {
            Favorites f = mapper.readValue(json == null || json.isBlank() ? "{}" : json, Favorites.class);
            return sanitize(f);
        } catch (JsonProcessingException e) {
            return Favorites.empty();
        }
    }

    /** Sin repetidos, sin valores invalidos y como mucho MAX_FAVORITES por grupo. */
    public static Favorites sanitize(Favorites f) {
        if (f == null) {
            return Favorites.empty();
        }
        return new Favorites(ids(f.lineas()), ids(f.estaciones()), accesses(f.accesos()), buses(f.colectivos()));
    }

    private static List<Long> ids(List<Long> values) {
        if (values == null) {
            return List.of();
        }
        return new ArrayList<>(values.stream().filter(Objects::nonNull).filter(v -> v > 0)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new))).stream().limit(MAX_FAVORITES).toList();
    }

    private static List<String> accesses(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return new ArrayList<>(values.stream().filter(Objects::nonNull).filter(v -> ACCESS_ID.matcher(v).matches())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new))).stream().limit(MAX_FAVORITES).toList();
    }

    /** "53a " -> "53A"; sin repetidos ni valores raros. */
    private static List<String> buses(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return new ArrayList<>(values.stream().filter(Objects::nonNull)
                .map(v -> v.replaceAll("\\s+", "").toUpperCase(Locale.ROOT))
                .filter(v -> BUS_LINE.matcher(v).matches())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new))).stream().limit(MAX_FAVORITES).toList();
    }

    static void checkPassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD) {
            throw bad("La contraseña tiene que tener al menos " + MIN_PASSWORD + " caracteres.");
        }
        if (password.length() > MAX_PASSWORD) {
            throw bad("La contraseña es demasiado larga.");
        }
    }

    static String normalizeEmail(String raw) {
        String email = raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw bad("Escribí un mail válido, por ejemplo nombre@gmail.com.");
        }
        return email;
    }

    public static String cleanName(String raw) {
        if (raw == null) {
            return null;
        }
        String name = raw.strip().replaceAll("\\s+", " ");
        if (name.isEmpty()) {
            return null;
        }
        return name.length() > 80 ? name.substring(0, 80) : name;
    }

    private static AccountException bad(String message) {
        return new AccountException(HttpStatus.BAD_REQUEST, message);
    }
}
