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
            new AccountServiceTest.FakeGoogle(), new ObjectMapper(), new MemorySessionStore());

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
        SessionResponse first = service.register("ana@gmail.com", "contraseña1", "Ana");
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
        SessionResponse s = service.register("ana@gmail.com", "contraseña1", "Ana");
        TokenService.Claims old = new TokenService.Claims(s.user().id(), Instant.now().minusSeconds(60));
        SessionResponse kept = service.closeOtherSessions(claims(s));
        assertThat(service.me(claims(kept)).id()).isEqualTo(s.user().id());
        assertThat(statusOf(() -> service.me(old))).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void preferenciasValidadas() {
        TokenService.Claims me = claims(service.register("ana@gmail.com", "contraseña1", "Ana"));
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
    void zonaDelClimaRedondeadaYSoloEnElAmba() {
        TokenService.Claims me = claims(service.register("ana@gmail.com", "contraseña1", "Ana"));
        Prefs saved = service.savePreferences(me, new Prefs(null, null,
                new Preferences.Zone("  San   Miguel ", -34.5426, -58.7121)));
        // Se guarda la celda de la grilla, no el punto.
        assertThat(saved.clima()).isEqualTo(new Preferences.Zone("San Miguel", -34.55, -58.7));
        assertThat(service.preferences(me).clima()).isEqualTo(saved.clima());
        // Fuera del AMBA (Cordoba) o sin nombre: no se guarda.
        assertThat(Preferences.zone(new Preferences.Zone("Córdoba", -31.42, -64.18))).isNull();
        assertThat(Preferences.zone(new Preferences.Zone(" ", -34.6, -58.4))).isNull();
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

    @Test
    void dispositivos() {
        service.register("ana@gmail.com", "contraseña1", "Ana");
        TokenService.Claims compu = claims(service.login("ana@gmail.com", "contraseña1"));
        TokenService.Claims celu = claims(service.login("ana@gmail.com", "contraseña1"));

        List<AccountService.DeviceView> devices = service.devices(compu);
        // Tres sesiones (crear la cuenta tambien entra): esta primero y marcada.
        assertThat(devices.size()).isEqualTo(3);
        assertThat(devices.get(0).current()).isEqualTo(true);
        assertThat(devices.get(0).id()).isEqualTo(compu.sessionId());
        assertThat(devices.get(0).device()).isEqualTo("Navegador desconocido");

        // Esta no se cierra desde la lista; otra si, y su token deja de valer.
        assertThat(statusOf(() -> service.closeDevice(compu, compu.sessionId()))).isEqualTo(HttpStatus.BAD_REQUEST);
        service.closeDevice(compu, celu.sessionId());
        assertThat(statusOf(() -> service.me(celu))).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(statusOf(() -> service.closeDevice(compu, celu.sessionId()))).isEqualTo(HttpStatus.NOT_FOUND);

        // Cerrar las demas deja solo esta; cerrar sesion la cierra.
        service.closeOtherSessions(compu);
        assertThat(service.devices(compu).size()).isEqualTo(1);
        service.logout(compu);
        assertThat(statusOf(() -> service.me(compu))).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void nombresDeLosDispositivos() {
        String win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
        String iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
        String edge = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0";
        String android = "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36";
        String mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:131.0) Gecko/20100101 Firefox/131.0";
        assertThat(DeviceNames.describe(win)).isEqualTo("Chrome en Windows");
        assertThat(DeviceNames.describe(iphone)).isEqualTo("Safari en iPhone");
        assertThat(DeviceNames.describe(edge)).isEqualTo("Edge en Windows");
        assertThat(DeviceNames.describe(android)).isEqualTo("Samsung Internet en Android");
        assertThat(DeviceNames.describe(mac)).isEqualTo("Firefox en Mac");
        assertThat(DeviceNames.describe(null)).isEqualTo("Navegador desconocido");
        assertThat(DeviceNames.describe("curl/8.0")).isEqualTo("Navegador desconocido");
        assertThat(DeviceNames.kind("Safari en iPhone")).isEqualTo("celular");
        assertThat(DeviceNames.kind("Chrome en Windows")).isEqualTo("computadora");
    }

    @Test
    void elTokenLlevaLaSesion() {
        TokenService t = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres");
        assertThat(t.verify(t.issue(7, "abcDEF123_-xyz")).orElseThrow().sessionId()).isEqualTo("abcDEF123_-xyz");
        assertThat(t.verify(t.issue(7)).orElseThrow().sessionId()).isEqualTo(null);
    }
}
