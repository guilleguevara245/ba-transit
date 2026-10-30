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
}
