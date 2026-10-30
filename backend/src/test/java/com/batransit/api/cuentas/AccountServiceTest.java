package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.Favorites;
import com.batransit.api.cuentas.AccountModels.SessionResponse;
import com.batransit.api.cuentas.GoogleTokenVerifier.GoogleIdentity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AccountServiceTest {

    /** Repositorio en memoria (sin base de datos): solo los metodos que usa el servicio. */
    static AppUserRepository memoryRepository(List<AppUser> rows) {
        return (AppUserRepository) Proxy.newProxyInstance(AppUserRepository.class.getClassLoader(),
                new Class<?>[] {AppUserRepository.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "findByEmail" -> rows.stream().filter(u -> u.getEmail().equals(args[0])).findFirst();
                    case "findByGoogleSub" -> rows.stream().filter(u -> args[0].equals(u.getGoogleSub())).findFirst();
                    case "findById" -> rows.stream().filter(u -> u.getId().equals(args[0])).findFirst();
                    case "saveAndFlush", "save" -> {
                        AppUser user = (AppUser) args[0];
                        if (user.getId() == null) {
                            user.setIdForTests((long) rows.size() + 1);
                            user.onCreate();
                            rows.add(user);
                        }
                        yield user;
                    }
                    case "delete" -> {
                        rows.remove(args[0]);
                        yield null;
                    }
                    case "toString" -> "memoria";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }

    /** Google falso: el "token" es "sub|mail|nombre". */
    static class FakeGoogle extends GoogleTokenVerifier {
        FakeGoogle() {
            super("cliente.apps.googleusercontent.com", new ObjectMapper());
        }

        @Override
        public Optional<GoogleIdentity> verify(String token) {
            if (token == null || !token.contains("|")) {
                return Optional.empty();
            }
            String[] p = token.split("\\|");
            return Optional.of(new GoogleIdentity(p[0], p[1], p.length > 2 ? p[2] : null, p.length > 3 ? p[3] : null));
        }
    }

    private final List<AppUser> rows = new ArrayList<>();
    private final TokenService tokens = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres");
    private final AccountService service =
            new AccountService(memoryRepository(rows), tokens, new FakeGoogle(), new ObjectMapper());

    /** La sesion de una respuesta, como la leeria el controlador. */
    private TokenService.Claims claims(SessionResponse s) {
        return tokens.verify(s.token()).orElseThrow();
    }

    private static HttpStatus statusOf(Runnable action) {
        return assertThrows(AccountException.class, action::run).status();
    }

    @Test
    void crearCuentaEIngresar() {
        SessionResponse created = service.register("  Ana@Gmail.com ", "contraseña1", " Ana  Pérez ");
        assertThat(created.user().email()).isEqualTo("ana@gmail.com");
        assertThat(created.user().name()).isEqualTo("Ana Pérez");
        assertThat(created.user().hasPassword()).isEqualTo(true);
        assertThat(claims(created).userId()).isEqualTo(created.user().id());
        // La contrasena no se guarda tal cual.
        assertThat(rows.get(0).getPasswordHash().contains("contraseña1")).isEqualTo(false);

        SessionResponse again = service.login("ANA@gmail.com", "contraseña1");
        assertThat(again.user().id()).isEqualTo(created.user().id());
    }

    @Test
    void erroresAlCrearCuenta() {
        service.register("ana@gmail.com", "contraseña1", null);
        assertThat(statusOf(() -> service.register("ana@gmail.com", "otraclave1", null))).isEqualTo(HttpStatus.CONFLICT);
        assertThat(statusOf(() -> service.register("beto@gmail.com", "corta", null))).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(statusOf(() -> service.register("sin-arroba", "contraseña1", null))).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void mailInexistenteYContrasenaMalaDanElMismoError() {
        service.register("ana@gmail.com", "contraseña1", null);
        AccountException wrongPassword = assertThrows(AccountException.class, () -> service.login("ana@gmail.com", "mal"));
        AccountException noUser = assertThrows(AccountException.class, () -> service.login("nadie@gmail.com", "mal"));
        assertThat(wrongPassword.status()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(noUser.getMessage()).isEqualTo(wrongPassword.getMessage());
    }

    @Test
    void googleCreaOVinculaLaCuenta() {
        SessionResponse first = service.loginWithGoogle("g-1|carla@gmail.com|Carla");
        assertThat(first.user().hasGoogle()).isEqualTo(true);
        assertThat(first.user().hasPassword()).isEqualTo(false);
        assertThat(first.user().name()).isEqualTo("Carla");
        // La misma cuenta de Google vuelve a la misma cuenta.
        assertThat(service.loginWithGoogle("g-1|carla@gmail.com").user().id()).isEqualTo(first.user().id());
        // Con mail y contrasena no se puede crear otra con ese mail.
        assertThat(statusOf(() -> service.register("carla@gmail.com", "contraseña1", null))).isEqualTo(HttpStatus.CONFLICT);

        // Cuenta con contrasena que despues entra con Google: se le suma Google.
        long ana = service.register("ana@gmail.com", "contraseña1", null).user().id();
        SessionResponse linked = service.loginWithGoogle("g-2|ana@gmail.com|Ana");
        assertThat(linked.user().id()).isEqualTo(ana);
        assertThat(linked.user().hasGoogle()).isEqualTo(true);
        assertThat(linked.user().hasPassword()).isEqualTo(true);

        assertThat(statusOf(() -> service.loginWithGoogle("token-roto"))).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void favoritosSeGuardanLimpios() {
        TokenService.Claims id = claims(service.register("ana@gmail.com", "contraseña1", null));
        assertThat(service.favorites(id)).isEqualTo(Favorites.empty());

        Favorites saved = service.saveFavorites(id,
                new Favorites(List.of(2L, 2L, -1L, 5L), List.of(27L), List.of("norte", "Oeste!", "norte"),
                        java.util.Arrays.asList("152", " 53a", "53A", "no vale!", null)));
        assertThat(saved).isEqualTo(new Favorites(List.of(2L, 5L), List.of(27L), List.of("norte"), List.of("152", "53A")));
        assertThat(service.favorites(id)).isEqualTo(saved);
        assertThat(service.saveFavorites(id, new Favorites(null, null, null, null))).isEqualTo(Favorites.empty());
    }

    @Test
    void imagenDeLaCuenta() {
        SessionResponse s = service.register("ana@gmail.com", "contraseña1", "Ana");
        TokenService.Claims c = claims(s);
        assertThat(s.user().image().kind()).isNull(); // de entrada, la inicial

        assertThat(service.setImage(c, "avatar", "carpincho").image().value()).isEqualTo("carpincho");
        // Los avatares viejos (las lineas) ya no existen.
        assertThat(statusOf(() -> service.setImage(c, "avatar", "subte-b"))).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(statusOf(() -> service.setImage(c, "avatar", "no-existe"))).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(statusOf(() -> service.setImage(c, "google", null))).isEqualTo(HttpStatus.BAD_REQUEST); // sin Google

        // Un JPEG minimo (los primeros bytes alcanzan para reconocerlo).
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0};
        String dataUrl = "data:image/jpeg;base64," + java.util.Base64.getEncoder().encodeToString(jpeg);
        var withPhoto = service.setPhoto(c, dataUrl).image();
        assertThat(withPhoto.kind()).isEqualTo("foto");
        assertThat(withPhoto.url()).isEqualTo(dataUrl);
        // Lo que dice ser PNG pero no lo es, no pasa.
        String fake = "data:image/png;base64," + java.util.Base64.getEncoder().encodeToString("hola".getBytes());
        assertThat(statusOf(() -> service.setPhoto(c, fake))).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(statusOf(() -> service.setPhoto(c, "https://otro.sitio/foto.jpg"))).isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(service.setImage(c, null, null).image().kind()).isNull();
    }

    @Test
    void conGoogleArrancaConSuFoto() {
        String pic = "https://lh3.googleusercontent.com/a/foto";
        SessionResponse s = service.loginWithGoogle("g-9|carla@gmail.com|Carla|" + pic);
        assertThat(s.user().image().kind()).isEqualTo("google");
        assertThat(s.user().image().url()).isEqualTo(pic);
        // Si despues elige un avatar, volver a entrar con Google no lo pisa.
        service.setImage(claims(s), "avatar", "hornero");
        assertThat(service.loginWithGoogle("g-9|carla@gmail.com|Carla|" + pic).user().image().value()).isEqualTo("hornero");
    }

    @Test
    void borrarLaCuenta() {
        SessionResponse s = service.register("ana@gmail.com", "contraseña1", null);
        service.delete(claims(s));
        assertThat(rows.size()).isEqualTo(0);
        // El token sigue firmado, pero la cuenta ya no existe.
        assertThat(statusOf(() -> service.me(claims(s)))).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
