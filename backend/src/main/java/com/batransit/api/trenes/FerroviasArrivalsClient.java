package com.batransit.api.trenes;

import com.batransit.api.trenes.FerroviasArrivals.Direction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pide a Ferrovias los proximos trenes de una estacion del Belgrano Norte.
 * Su propia pantalla se refresca cada 30 s, asi que guardamos cada
 * estacion 30 s: aunque muchos usuarios miren la misma estacion, a
 * Ferrovias le llega como mucho un pedido cada medio minuto.
 */
@Component
public class FerroviasArrivalsClient {

    private static final Logger log = LoggerFactory.getLogger(FerroviasArrivalsClient.class);
    static final Duration MAX_AGE = Duration.ofSeconds(30);
    /** Si fallo, no reintentar enseguida (evita insistir si el sitio esta caido). */
    static final Duration FAILURE_BACKOFF = Duration.ofSeconds(60);

    public record Snapshot(Instant fetchedAt, List<Direction> directions) {
    }

    private record Entry(Instant at, Snapshot snapshot) {
    }

    private final String url;
    private final RestClient restClient;
    private final Map<Integer, Entry> cache = new ConcurrentHashMap<>();

    public FerroviasArrivalsClient(
            @Value("${app.trenes.ferrovias-url:http://proximostrenes.ferrovias.com.ar/estaciones.asp}") String url) {
        this.url = url;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(4_000);
        requestFactory.setReadTimeout(8_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory)
                .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
    }

    /** Proximos trenes de la estacion, o vacio si Ferrovias no respondio. */
    public Optional<Snapshot> arrivals(int stationId) {
        Instant now = Instant.now();
        Entry cached = cache.get(stationId);
        if (cached != null) {
            Duration maxAge = cached.snapshot() == null ? FAILURE_BACKOFF : MAX_AGE;
            if (cached.at().plus(maxAge).isAfter(now)) {
                return Optional.ofNullable(cached.snapshot());
            }
        }
        Snapshot snapshot = fetch(stationId, now);
        cache.put(stationId, new Entry(now, snapshot));
        return Optional.ofNullable(snapshot);
    }

    private Snapshot fetch(int stationId, Instant now) {
        try {
            byte[] body = restClient.post().uri(url)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body("idEst=" + stationId + "&adm=0")
                    .retrieve().body(byte[].class);
            if (body == null) {
                return null;
            }
            // El sitio responde en ISO-8859-1 (lo dice su Content-Type).
            String html = new String(body, StandardCharsets.ISO_8859_1);
            if (!html.contains("table_title")) {
                log.warn("Ferrovias: la respuesta de la estacion {} no tiene el formato esperado.", stationId);
                return null;
            }
            return new Snapshot(now, FerroviasArrivals.parse(html));
        } catch (RestClientException e) {
            log.warn("Ferrovias no respondio para la estacion {} ({}).", stationId,
                    e.getMostSpecificCause().getClass().getSimpleName());
            return null;
        }
    }
}
