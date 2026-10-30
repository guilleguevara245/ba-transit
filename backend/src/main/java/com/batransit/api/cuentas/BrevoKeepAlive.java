package com.batransit.api.cuentas;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Brevo da de baja las claves de la API que pasan 90 dias sin usarse, y los
 * mails de "recuperar la contraseña" son pocos. Para que la clave no venza,
 * una vez por dia (y al arrancar) se hace una consulta liviana a la cuenta,
 * que no manda mails. El resultado se ve en la pagina "Estado de los datos".
 */
@Component
public class BrevoKeepAlive {

    private final MailSender mail;

    public BrevoKeepAlive(MailSender mail) {
        this.mail = mail;
    }

    @Scheduled(initialDelay = 120_000L, fixedDelay = 24 * 3600_000L)
    public void ping() {
        mail.ping();
    }
}
