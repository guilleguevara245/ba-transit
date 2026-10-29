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
            return Optional.of(new GoogleIdentity(p[0], p[1], p.length > 2 ? p[2] : null));
        }
    }

    private final List<AppUser> rows = new ArrayList<>();
    private final TokenService tokens = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres");
    private final AccountService service =
            new AccountService(memoryRepository(rows), tokens, new FakeGoogle(), new ObjectMapper());

    private static HttpStatus statusOf(Runnable action) {
        return assertThrows(AccountException.class, action::run).status();
    }

    @Test
    void crearCuentaEIngresar() {
        SessionResponse created = service.register("  Ana@Gmail.com ", "contraseña1", " Ana  Pérez ");
        assertThat(created.user().email()).isEqualTo("ana@gmail.com");
        assertThat(created.user().name()).isEqualTo("Ana Pérez");
        assertThat(created.user().hasPassword()).isEqualTo(true);
        assertThat(tokens.verify(created.token())).isEqualTo(Optional.of(created.user().id()));
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
        long id = service.register("ana@gmail.com", "contraseña1", null).user().id();
        assertThat(service.favorites(id)).isEqualTo(Favorites.empty());

        Favorites saved = service.saveFavorites(id,
                new Favorites(List.of(2L, 2L, -1L, 5L), List.of(27L), List.of("norte", "Oeste!", "norte")));
        assertThat(saved).isEqualTo(new Favorites(List.of(2L, 5L), List.of(27L), List.of("norte")));
        assertThat(service.favorites(id)).isEqualTo(saved);
        assertThat(service.saveFavorites(id, new Favorites(null, null, null))).isEqualTo(Favorites.empty());
    }

    @Test
    void borrarLaCuenta() {
        SessionResponse s = service.register("ana@gmail.com", "contraseña1", null);
        service.delete(s.user().id());
        assertThat(rows.size()).isEqualTo(0);
        // El token sigue firmado, pero la cuenta ya no existe.
        assertThat(statusOf(() -> service.me(s.user().id()))).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
