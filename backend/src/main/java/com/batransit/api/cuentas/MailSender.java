package com.batransit.api.cuentas;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Envio de mails con la API de Brevo (plan gratuito: 300 mails por dia).
 * Necesita BREVO_API_KEY y MAIL_FROM (un remitente verificado en Brevo).
 * La clave va en un header y nunca se loguea.
 */
@Component
public class MailSender {

    private static final Logger log = LoggerFactory.getLogger(MailSender.class);
    static final String URL = "https://api.brevo.com/v3/smtp/email";

    private final String apiKey;
    private final String from;
    private final String fromName;
    private final RestClient restClient;

    @Autowired
    public MailSender(@Value("${app.mail.brevo-api-key:}") String apiKey,
                      @Value("${app.mail.from:}") String from,
                      @Value("${app.mail.from-name:BA Transit}") String fromName) {
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.from = from == null ? "" : from.strip();
        this.fromName = fromName;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(15_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isConfigured() {
        return !apiKey.isEmpty() && !from.isEmpty();
    }

    /** true si Brevo acepto el mail. */
    public boolean send(String to, String subject, String text, String html) {
        if (!isConfigured()) {
            return false;
        }
        Map<String, Object> body = Map.of(
                "sender", Map.of("name", fromName, "email", from),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "textContent", text,
                "htmlContent", html);
        try {
            restClient.post().uri(URL)
                    .header("api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RestClientException e) {
            String reason = e instanceof RestClientResponseException r
                    ? "HTTP " + r.getStatusCode().value()
                    : e.getMostSpecificCause().getClass().getSimpleName();
            log.warn("No se pudo enviar un mail ({})", reason);
            return false;
        }
    }
}
