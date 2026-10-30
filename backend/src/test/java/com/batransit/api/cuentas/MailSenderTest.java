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
        assertThat(MailSender.describe(503, "<html>caido</html>")).isEqualTo("HTTP 503");
        assertThat(MailSender.describe(500, null)).isEqualTo("HTTP 500");
    }
}
