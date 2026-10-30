package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.SessionResponse;
import com.batransit.api.cuentas.Preferences.Notices;
import com.batransit.api.cuentas.Preferences.Prefs;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Nombre, contraseña, cerrar las otras sesiones, preferencias y descargar los datos. */
class AccountSettingsTest {

    private final List<AppUser> rows = new ArrayList<>();
    private final TokenService tokens = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres");
    private final AccountService service = new AccountService(AccountServiceTest.memoryRepository(rows), tokens,
            new AccountServiceTest.FakeGoogle(), new ObjectMapper());

    private TokenService.Claims claims(SessionResponse s) {
        return tokens.verify(s.token()).orElseThrow();
    }

    private static HttpStatus statusOf(Runnable action) {
        return assertThrows(AccountException.class, action::run).status();
    }

    @Test
    void cambiarElNombre() {
        TokenService.Claims me = claims(service.register("ana@gmail.com", "contraseña1", "Ana"));
        assertThat(service.rename(me, "  Ana   María ").name()).isEqualTo("Ana María");
        assertThat(statusOf(() -> service.rename(me, "   "))).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void cambiarLaContrasenaCierraLasOtrasSesiones() {
        SessionResponse first = service.register("ana@gmail.com", "contraseña1", null);
        // Una sesion "vieja" (de otro dispositivo, de hace un rato).
        TokenService.Claims old = new TokenService.Claims(first.user().id(), Instant.now().minusSeconds(120));

        assertThat(statusOf(() -> service.changePassword(claims(first), "mal", "nueva-clave1"))).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(statusOf(() -> service.changePassword(claims(first), "contraseña1", "corta"))).isEqualTo(HttpStatus.BAD_REQUEST);

        SessionResponse renewed = service.changePassword(claims(first), "contraseña1", "nueva-clave1");
        assertThat(service.me(claims(renewed)).email()).isEqualTo("ana@gmail.com");
        assertThat(statusOf(() -> service.me(old))).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(service.login("ana@gmail.com", "nueva-clave1").user().id()).isEqualTo(first.user().id());
    }

    @Test
    void cuentaDeGoogleAgregaContrasenaSinLaActual() {
        SessionResponse google = service.loginWithGoogle("g-1|carla@gmail.com|Carla");
        SessionResponse withPassword = service.changePassword(claims(google), null, "clave-nueva1");
        assertThat(withPassword.user().hasPassword()).isEqualTo(true);
        assertThat(service.login("carla@gmail.com", "clave-nueva1").user().id()).isEqualTo(google.user().id());
    }

    @Test
    void cerrarLasOtrasSesiones() {
        SessionResponse s = service.register("ana@gmail.com", "contraseña1", null);
        TokenService.Claims old = new TokenService.Claims(s.user().id(), Instant.now().minusSeconds(60));
        SessionResponse kept = service.closeOtherSessions(claims(s));
        assertThat(service.me(claims(kept)).id()).isEqualTo(s.user().id());
        assertThat(statusOf(() -> service.me(old))).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void preferenciasValidadas() {
        TokenService.Claims me = claims(service.register("ana@gmail.com", "contraseña1", null));
        Prefs saved = service.savePreferences(me, new Prefs("dark", new Notices(2,
                Arrays.asList("lineas", "clima", "spam", null), true, true, 23, 99, true, "25:00",
                List.of(1, 9, 3, 3), true, 20)));
        assertThat(saved.tema()).isEqualTo("dark");
        Notices n = saved.avisos();
        assertThat(n.kinds()).isEqualTo(List.of("lineas", "clima"));
        assertThat(n.quietFrom()).isEqualTo(23);
        assertThat(n.quietTo()).isEqualTo(null);
        assertThat(n.summaryTime()).isEqualTo(null);
        assertThat(n.summaryDays()).isEqualTo(List.of(1, 3));
        assertThat(n.lastTrainMinutes()).isEqualTo(null);
        assertThat(service.preferences(me)).isEqualTo(saved);

        assertThat(service.savePreferences(me, new Prefs("violeta", null))).isEqualTo(Prefs.empty());
        assertThat(service.readPreferences("{roto")).isEqualTo(Prefs.empty());
    }

    @Test
    void descargarLosDatos() {
        TokenService.Claims me = claims(service.register("ana@gmail.com", "contraseña1", "Ana"));
        Map<String, Object> data = service.exportData(me);
        assertThat(List.copyOf(data.keySet())).isEqualTo(List.of("cuenta", "favoritos", "lugares", "preferencias"));
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) data.get("cuenta");
        assertThat(account.get("mail")).isEqualTo("ana@gmail.com");
        assertThat(account.get("entraConGoogle")).isEqualTo(false);
        // Nunca la contraseña, ni siquiera cifrada.
        assertThat(data.toString().contains("pbkdf2")).isEqualTo(false);
        assertThat(AccountDataExport.host("https://fcm.googleapis.com/fcm/send/abc")).isEqualTo("fcm.googleapis.com");
        assertThat(AccountDataExport.host("no es url")).isEqualTo(null);
    }
}
