package com.batransit.api.cuentas;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Sin clave de Brevo no se intenta nada (ni mails ni la consulta para mantener viva la clave). */
class MailSenderTest {

    @Test
    void sinClaveNoHaceNada() {
        MailSender mail = new MailSender("", "hola@ba-transit.ar", "BA Transit");
        assertThat(mail.isConfigured()).isEqualTo(false);
        assertThat(mail.ping()).isEqualTo(false);
        assertThat(mail.send("ana@gmail.com", "Hola", "texto", "<p>texto</p>")).isEqualTo(false);

        // Con clave pero sin remitente: no manda mails.
        assertThat(new MailSender("clave", " ", "BA Transit").isConfigured()).isEqualTo(false);
    }

    @Test
    void motivoDelError() {
        assertThat(MailSender.describe(401, "{\"code\":\"unauthorized\",\"message\":\"We have detected you are using an unrecognised IP address 1.2.3.4\"}"))
                .isEqualTo("HTTP 401: la IP del servidor no está autorizada en Brevo");
        assertThat(MailSender.describe(403, "{\"code\":\"permission_denied\",\"message\":\"Key not allowed\"}"))
                .isEqualTo("HTTP 403: permission_denied");
        assertThat(MailSender.describe(403, "{\"code\":\"permission_denied\",\"message\":\"Unable to send email. Your SMTP account is not yet activated. Please contact us at contact@brevo.com to get it activated.\"}"))
                .isEqualTo("HTTP 403: Brevo todavía no activó el envío de mails de la cuenta");
        assertThat(MailSender.describe(403, "{\"code\":\"permission_denied\",\"message\":\"Your account has been suspended\"}"))
                .isEqualTo("HTTP 403: la cuenta de Brevo está suspendida");
        assertThat(MailSender.message("{\"code\":\"permission_denied\",\"message\":\"Key \\\"x\\\" not allowed\"}"))
                .isEqualTo("Key \\\"x\\\" not allowed");
        assertThat(MailSender.message("<html>caido</html>")).isNull();

        // Un 403 solo por el permiso de la clave no es una falla; la cuenta sin activar si.
        assertThat(MailSender.onlyOutOfScope(403, "{\"code\":\"permission_denied\",\"message\":\"Key not allowed for this endpoint\"}")).isEqualTo(true);
        assertThat(MailSender.onlyOutOfScope(403, "{\"code\":\"permission_denied\",\"message\":\"Your SMTP account is not yet activated\"}")).isEqualTo(false);
        assertThat(MailSender.onlyOutOfScope(401, "{\"code\":\"unauthorized\",\"message\":\"Key not found\"}")).isEqualTo(false);
        assertThat(MailSender.onlyOutOfScope(403, null)).isEqualTo(false);
        assertThat(MailSender.describe(503, "<html>caido</html>")).isEqualTo("HTTP 503");
        assertThat(MailSender.describe(500, null)).isEqualTo("HTTP 500");
    }
}
