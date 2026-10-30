package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.Favorites;
import com.batransit.api.cuentas.AccountModels.SessionResponse;
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
                user.getGoogleSub() != null, user.getCreatedAt());
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
        return new Favorites(ids(f.lineas()), ids(f.estaciones()), accesses(f.accesos()));
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
