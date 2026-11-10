package com.batransit.api.contacto;

import com.batransit.api.contacto.ContactService.Account;
import com.batransit.api.contacto.ContactService.ContactRequest;
import com.batransit.api.contacto.ContactServiceTest.FakeMail;
import com.batransit.api.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContactControllerTest {

    private static final ContactRequest OK = ContactServiceTest.request("idea", "Estaría bueno ver el Tren de la Costa");
    private static final Account ANA = new Account(12, "ana.perez@gmail.com", "Ana", "Pérez",
            Instant.parse("2026-11-03T15:00:00Z"));
    /** Solo "Bearer buena" es una sesion valida. */
    private static final Function<String, Account> SESSIONS = header -> "Bearer buena".equals(header) ? ANA : null;

    private static MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/contacto");
        request.setRemoteAddr("190.1.2.3");
        request.addHeader("User-Agent", "Firefox");
        return request;
    }

    private static ContactController controller(FakeMail mail, String to) {
        return new ContactController(new ContactService(mail, to), new ContactRateLimiter(), SESSIONS);
    }

    @Test
    void mandaYRespondeSinCuerpo() {
        FakeMail mail = new FakeMail();
        ContactController controller = controller(mail, "yo@ejemplo.com");

        assertThat(controller.status().get("available")).isTrue();
        assertThat(controller.send(OK, request(), null).getStatusCode().value()).isEqualTo(204);
        assertThat(mail.sent.get(0)[2]).contains("Navegador: Firefox");
        assertThat(mail.sent.get(0)[2]).contains("Cuenta: no (escribió sin ingresar)");
    }

    @Test
    void conSesionVanLosDatosDeLaCuentaYSinSesionValidaNo() {
        FakeMail mail = new FakeMail();
        ContactController controller = controller(mail, "yo@ejemplo.com");

        controller.send(OK, request(), "Bearer buena");
        controller.send(OK, request(), "Bearer vencida");

        assertThat(mail.sent.get(0)[2]).contains("Cuenta: N.º 12 · Ana Pérez · ana.perez@gmail.com");
        assertThat(mail.sent.get(1)[2]).contains("Cuenta: no (escribió sin ingresar)");
    }

    @Test
    void sinConfigurarAvisaQueNoEstaDisponible() {
        ContactController controller = controller(new FakeMail(), "");

        assertThat(controller.status().get("available")).isFalse();
        assertThatThrownBy(() -> controller.send(OK, request(), null)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void aUnBotLeRespondeBienPeroNoMandaNada() {
        FakeMail mail = new FakeMail();
        ContactController controller = controller(mail, "yo@ejemplo.com");

        ContactRequest bot = new ContactRequest("idea", "Compre seguidores baratos", "Bot", "Bot", "bot@spam.example", "/",
                "http://spam.example");
        assertThat(controller.send(bot, request(), null).getStatusCode().value()).isEqualTo(204);
        assertThat(mail.sent).isEmpty();
    }

    @Test
    void unMensajeInvalidoNoGastaElCupo() {
        FakeMail mail = new FakeMail();
        ContactController controller = controller(mail, "yo@ejemplo.com");

        for (int i = 0; i < ContactRateLimiter.MAX_PER_IP + 3; i++) {
            assertThatThrownBy(() -> controller.send(ContactServiceTest.request("idea", "corto"), request(), null))
                    .isInstanceOf(BadRequestException.class);
        }
        assertThat(controller.send(OK, request(), null).getStatusCode().value()).isEqualTo(204);
    }

    @Test
    void frenaDespuesDeVariosSeguidosYSiElMailFallaDa503() {
        FakeMail mail = new FakeMail();
        ContactController controller = controller(mail, "yo@ejemplo.com");
        for (int i = 0; i < ContactRateLimiter.MAX_PER_IP; i++) {
            controller.send(OK, request(), null);
        }
        assertThatThrownBy(() -> controller.send(OK, request(), null)).hasMessageContaining("varios mensajes seguidos");

        mail.works = false;
        MockHttpServletRequest other = request();
        other.setRemoteAddr("200.5.6.7");
        assertThatThrownBy(() -> controller.send(OK, other, null)).hasMessageContaining("No se pudo mandar");
    }
}
