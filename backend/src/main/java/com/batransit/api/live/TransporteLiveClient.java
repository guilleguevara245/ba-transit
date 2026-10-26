package com.batransit.api.live;

import com.batransit.api.config.TransporteApiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pide datos en tiempo real a la API Transporte (subte, colectivos,
 * EcoBici) y guarda cada respuesta unos segundos, para que muchas
 * visitas juntas no se traduzcan en muchas llamadas a la API.
 *
 * Las credenciales viajan en la URL: nunca se loguea la URL ni el
 * mensaje original del error (ver TransporteApiClient).
 */
@Component
public class TransporteLiveClient {

    private static final Logger log = LoggerFactory.getLogger(TransporteLiveClient.class);

    private record Cached(JsonNode body, Instant fetchedAt) {
    }

    private final TransporteApiProperties properties;
    private final RestClient restClient;
    private final Clock clock;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public TransporteLiveClient(TransporteApiProperties properties) {
        this.properties = properties;
        this.clock = Clock.systemUTC();
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(15_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isConfigured() {
        return properties.getClientId() != null && !properties.getClientId().isBlank()
                && properties.getClientSecret() != null && !properties.getClientSecret().isBlank();
    }

    /**
     * Respuesta de la ruta (por ejemplo "/subtes/forecastGTFS"), de la
     * cache si tiene menos de maxAge. Si la API falla, devuelve la ultima
     * respuesta guardada (si hay) o vacio.
     */
    public Optional<Fetched> get(String path, Duration maxAge) {
        Instant now = clock.instant();
        Cached cached = cache.get(path);
        if (cached != null && cached.fetchedAt().plus(maxAge).isAfter(now)) {
            return Optional.of(new Fetched(cached.body(), cached.fetchedAt()));
        }
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            JsonNode body = restClient.get()
                    // La ruta puede traer parametros propios (?month=...): las credenciales van con & en ese caso.
                    .uri(properties.getBaseUrl() + path + (path.contains("?") ? "&" : "?")
                                    + "client_id={id}&client_secret={secret}",
                            properties.getClientId(), properties.getClientSecret())
                    .retrieve()
                    .body(JsonNode.class);
            if (body == null) {
                return Optional.ofNullable(cached).map(c -> new Fetched(c.body(), c.fetchedAt()));
            }
            cache.put(path, new Cached(body, now));
            return Optional.of(new Fetched(body, now));
        } catch (RestClientException e) {
            String reason = e instanceof RestClientResponseException r
                    ? "HTTP " + r.getStatusCode().value()
                    : e.getMostSpecificCause().getClass().getSimpleName();
            log.warn("API Transporte {} no respondio ({})", path, reason);
            return Optional.ofNullable(cached).map(c -> new Fetched(c.body(), c.fetchedAt()));
        }
    }

    /** Una respuesta de la API y cuando se obtuvo. */
    public record Fetched(JsonNode body, Instant fetchedAt) {
    }
}
