package com.batransit.api.notificaciones;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Manda un aviso a una suscripcion: lo cifra para ese navegador, lo firma
 * con VAPID y lo entrega al servicio de avisos (Google, Mozilla, Apple,
 * Microsoft). Solo acepta esos servicios: el servidor nunca le hace POST a
 * una direccion cualquiera que mande alguien.
 */
@Component
public class WebPushSender {

    private static final Logger log = LoggerFactory.getLogger(WebPushSender.class);

    /** Servicios de avisos conocidos (el endpoint tiene que ser de alguno). */
    static final List<String> PUSH_HOSTS = List.of("fcm.googleapis.com", "updates.push.services.mozilla.com",
            "push.services.mozilla.com", "web.push.apple.com", "notify.windows.com");

    public enum Result { SENT, GONE, FAILED }

    private final VapidKeys keys;
    private final ObjectMapper mapper;
    private final String subject;
    private final RestClient restClient;

    public WebPushSender(VapidKeys keys, ObjectMapper mapper,
                         @Value("${app.site-url:https://ba-transit.onrender.com}") String subject) {
        this.keys = keys;
        this.mapper = mapper;
        this.subject = subject;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(10_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /** Si la direccion es de un servicio de avisos conocido y usa https. */
    public static boolean isPushEndpoint(String endpoint) {
        try {
            URI uri = URI.create(endpoint);
            String host = uri.getHost();
            return "https".equals(uri.getScheme()) && host != null
                    && PUSH_HOSTS.stream().anyMatch(h -> host.equals(h) || host.endsWith("." + h));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public Result send(PushSubscription subscription, PushMessage message) {
        try {
            byte[] payload = mapper.writeValueAsBytes(payload(message));
            Base64.Decoder dec = Base64.getUrlDecoder();
            byte[] body = WebPushCrypto.encrypt(payload, dec.decode(subscription.getP256dh()), dec.decode(subscription.getAuth()));
            URI endpoint = URI.create(subscription.getEndpoint());
            String audience = endpoint.getScheme() + "://" + endpoint.getHost();
            String authorization = WebPushCrypto.vapidAuthorization(audience, subject,
                    Instant.now().plusSeconds(12 * 3600).getEpochSecond(), keys.privateKey(), keys.publicKey());
            restClient.post().uri(endpoint)
                    .header("Authorization", authorization)
                    .header("Content-Encoding", "aes128gcm")
                    .header("Content-Type", "application/octet-stream")
                    .header("TTL", "3600")
                    .header("Urgency", message.resolved() ? "normal" : "high")
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            return Result.SENT;
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (status == 404 || status == 410) {
                return Result.GONE; // el navegador ya no quiere avisos (o borro la suscripcion)
            }
            log.warn("Aviso no entregado (HTTP {})", status);
            return Result.FAILED;
        } catch (RestClientException | GeneralSecurityException | JsonProcessingException | IllegalArgumentException e) {
            log.warn("Aviso no entregado ({})", e.getClass().getSimpleName());
            return Result.FAILED;
        }
    }

    static Map<String, Object> payload(PushMessage m) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("title", m.title());
        p.put("body", m.body());
        p.put("icon", m.icon());
        p.put("url", m.url());
        p.put("tag", m.tag());
        p.put("action", m.action());
        p.put("resolved", m.resolved());
        return p;
    }

    /** Para los tests: el JSON que va cifrado. */
    static String payloadJson(ObjectMapper mapper, PushMessage m) throws JsonProcessingException {
        return new String(mapper.writeValueAsBytes(payload(m)), StandardCharsets.UTF_8);
    }
}
