package com.batransit.api.cuentas;

import com.batransit.api.estado.SourceHealth;
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
    static final String ACCOUNT_URL = "https://api.brevo.com/v3/account";

    private final String apiKey;
    private final String from;
    private final String fromName;
    private final RestClient restClient;
    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

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
            health.ok(SourceHealth.Source.BREVO);
            return true;
        } catch (RestClientException e) {
            String reason = reason(e);
            health.fail(SourceHealth.Source.BREVO, reason);
            log.warn("No se pudo enviar un mail ({})", reason);
            return false;
        }
    }

    /**
     * Una consulta liviana a la cuenta de Brevo (no manda mails ni gasta el
     * cupo). Brevo da de baja las claves que pasan 90 dias sin usarse: esta
     * consulta cuenta como uso. true si la clave sigue valiendo.
     */
    public boolean ping() {
        if (apiKey.isEmpty()) {
            return false;
        }
        try {
            restClient.get().uri(ACCOUNT_URL).header("api-key", apiKey).retrieve().toBodilessEntity();
            health.ok(SourceHealth.Source.BREVO);
            return true;
        } catch (RestClientException e) {
            String reason = reason(e);
            health.fail(SourceHealth.Source.BREVO, reason);
            log.warn("La clave de Brevo no respondio bien ({})", reason);
            return false;
        }
    }

    private static String reason(RestClientException e) {
        if (e instanceof RestClientResponseException r) {
            String body = r.getResponseBodyAsString();
            // El texto de Brevo va al log del servidor (Render), que es donde se ve el motivo completo.
            String message = message(body);
            if (message != null) {
                log.warn("Brevo respondio HTTP {}: {}", r.getStatusCode().value(), message);
            }
            return describe(r.getStatusCode().value(), body);
        }
        return e.getMostSpecificCause().getClass().getSimpleName();
    }

    /** El "message" de la respuesta de Brevo, corto (no trae la clave). */
    static String message(String body) {
        if (body == null) {
            return null;
        }
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"message\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.){1,300})\"").matcher(body);
        return m.find() ? m.group(1) : null;
    }

    /**
     * Motivo corto para la pagina de Estado, a partir de la respuesta de
     * Brevo ({"code":"unauthorized","message":"..."}). Solo se usa el codigo
     * (texto fijo de Brevo) y se reconoce el bloqueo por IP; nunca la clave.
     */
    static String describe(int status, String body) {
        String text = body == null ? "" : body.toLowerCase(java.util.Locale.ROOT);
        if (text.contains("unrecognised ip") || text.contains("unrecognized ip") || text.contains("ip not authorized")
                || text.contains("ip address")) {
            return "HTTP " + status + ": la IP del servidor no está autorizada en Brevo";
        }
        // 403 de cuentas nuevas o revisadas: Brevo tiene que habilitar el envio de mails transaccionales.
        if (text.contains("not yet activated") || text.contains("not activated") || text.contains("under validation")) {
            return "HTTP " + status + ": Brevo todavía no activó el envío de mails de la cuenta";
        }
        if (text.contains("suspended") || text.contains("blocked") || text.contains("deactivated")) {
            return "HTTP " + status + ": la cuenta de Brevo está suspendida";
        }
        java.util.regex.Matcher code = java.util.regex.Pattern.compile("\"code\"\\s*:\\s*\"([a-z_]{1,40})\"").matcher(text);
        return code.find() ? "HTTP " + status + ": " + code.group(1) : "HTTP " + status;
    }
}
