package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.SessionResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordResetServiceTest {

    static class MovingClock extends Clock {
        Instant now = Instant.parse("2026-10-29T22:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    /** Mail falso: guarda lo que se "mando". */
    static class FakeMail extends MailSender {
        final List<String[]> sent = new ArrayList<>();
        boolean configured = true;

        FakeMail() {
            super("clave", "bot@batransit.test", "BA Transit");
        }

        @Override
        public boolean isConfigured() {
            return configured;
        }

        @Override
        public boolean send(String to, String subject, String text, String html) {
            sent.add(new String[] {to, subject, text, html});
            return true;
        }
    }

    static PasswordResetRepository memoryResets(List<PasswordReset> rows) {
        return (PasswordResetRepository) Proxy.newProxyInstance(PasswordResetRepository.class.getClassLoader(),
                new Class<?>[] {PasswordResetRepository.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "findByTokenHash" -> rows.stream().filter(r -> r.getTokenHash().equals(args[0])).findFirst();
                    case "findByUserIdAndUsedAtIsNull" ->
                            rows.stream().filter(r -> r.getUserId().equals(args[0]) && r.getUsedAt() == null).toList();
                    case "countByUserIdAndCreatedAtAfter" -> rows.stream()
                            .filter(r -> r.getUserId().equals(args[0]) && r.getCreatedAt().isAfter((Instant) args[1])).count();
                    case "save" -> {
                        PasswordReset r = (PasswordReset) args[0];
                        r.onCreate();
                        rows.add(r);
                        yield r;
                    }
                    case "toString" -> "memoria";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }

    private final List<AppUser> users = new ArrayList<>();
    private final List<PasswordReset> resetRows = new ArrayList<>();
    private final MovingClock clock = new MovingClock();
    private final TokenService tokens = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres", clock);
    private final AppUserRepository userRepo = AccountServiceTest.memoryRepository(users);
    private final AccountService accounts =
            new AccountService(userRepo, tokens, new AccountServiceTest.FakeGoogle(), new ObjectMapper(),
                    new MemorySessionStore());
    private final FakeMail mail = new FakeMail();
    private final PasswordResetService service =
            new PasswordResetService(userRepo, memoryResets(resetRows), accounts, mail, "https://ba-transit.onrender.com/", clock);

    private String codeFromMail() {
        String text = mail.sent.get(mail.sent.size() - 1)[2];
        int at = text.indexOf("codigo=");
        return text.substring(at + 7, text.indexOf('\n', at));
    }

    @Test
    void recuperarYEntrarConLaNueva() {
        SessionResponse before = accounts.register("ana@gmail.com", "contraseña1", "Ana");
        clock.now = clock.now.plusSeconds(5);
        service.request("ANA@gmail.com");

        assertThat(mail.sent.size()).isEqualTo(1);
        assertThat(mail.sent.get(0)[0]).isEqualTo("ana@gmail.com");
        assertThat(mail.sent.get(0)[2].contains("https://ba-transit.onrender.com/restablecer?codigo=")).isEqualTo(true);
        // En la base queda el hash, no el codigo.
        String code = codeFromMail();
        assertThat(resetRows.get(0).getTokenHash()).isEqualTo(PasswordResetService.sha256(code));
        assertThat(resetRows.get(0).getTokenHash().equals(code)).isEqualTo(false);

        clock.now = clock.now.plusSeconds(60);
        SessionResponse after = service.reset(code, "nueva-clave-1");
        assertThat(after.user().email()).isEqualTo("ana@gmail.com");
        assertThat(accounts.login("ana@gmail.com", "nueva-clave-1").user().id()).isEqualTo(before.user().id());
        assertThat(assertThrows(AccountException.class, () -> accounts.login("ana@gmail.com", "contraseña1")).status())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        // La sesion vieja (de otro dispositivo) se cierra; la nueva vale.
        assertThat(assertThrows(AccountException.class, () -> accounts.me(tokens.verify(before.token()).orElseThrow())).status())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(accounts.me(tokens.verify(after.token()).orElseThrow()).id()).isEqualTo(before.user().id());

        // El link no se puede usar dos veces.
        assertThat(assertThrows(AccountException.class, () -> service.reset(code, "otra-clave-22")).status())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void mailSinCuentaNoMandaNadaNiAvisa() {
        service.request("nadie@gmail.com");
        assertThat(mail.sent.size()).isEqualTo(0);
    }

    @Test
    void linkVencidoOInventado() {
        accounts.register("ana@gmail.com", "contraseña1", "Ana");
        service.request("ana@gmail.com");
        String code = codeFromMail();
        clock.now = clock.now.plus(PasswordResetService.VALIDITY).plusSeconds(1);
        assertThat(assertThrows(AccountException.class, () -> service.reset(code, "nueva-clave-1")).status())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(assertThrows(AccountException.class, () -> service.reset("inventado", "nueva-clave-1")).status())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // Contrasena corta: se avisa antes de mirar el link.
        assertThat(assertThrows(AccountException.class, () -> service.reset(code, "corta")).getMessage().contains("8"))
                .isEqualTo(true);
    }

    @Test
    void comoMuchoTresLinksPorHora() {
        accounts.register("ana@gmail.com", "contraseña1", "Ana");
        for (int i = 0; i < 5; i++) {
            clock.now = clock.now.plusSeconds(10);
            service.request("ana@gmail.com");
        }
        assertThat(mail.sent.size()).isEqualTo(PasswordResetService.MAX_PER_HOUR);
        clock.now = clock.now.plus(Duration.ofHours(1));
        service.request("ana@gmail.com");
        assertThat(mail.sent.size()).isEqualTo(PasswordResetService.MAX_PER_HOUR + 1);
    }

    @Test
    void sinMailConfiguradoNoEstaDisponible() {
        mail.configured = false;
        assertThat(service.isAvailable()).isEqualTo(false);
        assertThat(assertThrows(AccountException.class, () -> service.request("ana@gmail.com")).status())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
}
