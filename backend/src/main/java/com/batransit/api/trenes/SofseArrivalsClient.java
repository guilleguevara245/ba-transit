package com.batransit.api.trenes;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.trenes.SofseArrivals.Parsed;
import com.batransit.api.trenes.SofseArrivals.Station;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pide los proximos trenes de Trenes Argentinos a la API de Trenes de Ariel
 * Aguirre (instancia publica en ariedro.dev, configurable con
 * TRENES_API_URL). Para no cargarla:
 * - las estaciones de cada linea se piden una vez por dia y se emparejan
 *   con las nuestras por ubicacion;
 * - los arribos de cada estacion se guardan 30 s (aunque muchos miren la
 *   misma estacion, le llega como mucho un pedido cada medio minuto);
 * - si falla, no se reintenta enseguida.
 */
@Component
public class SofseArrivalsClient {

    private static final Logger log = LoggerFactory.getLogger(SofseArrivalsClient.class);

    static final Duration MAX_AGE = Duration.ofSeconds(30);
    static final Duration FAILURE_BACKOFF = Duration.ofSeconds(60);
    static final Duration CATALOG_MAX_AGE = Duration.ofHours(24);
    static final Duration CATALOG_BACKOFF = Duration.ofMinutes(10);
    /** Cuantos arribos pedir: alcanza para los dos sentidos. */
    static final int REQUESTED = 12;

    public record Snapshot(Instant fetchedAt, Parsed parsed) {
    }

    private record Entry<T>(Instant at, T value) {
    }

    private final String baseUrl;
    private final RestClient restClient;
    private final ObjectMapper mapper;
    private final Clock clock;
    private SourceHealth health = SourceHealth.NOOP;

    private final Map<Integer, Entry<Snapshot>> arrivals = new ConcurrentHashMap<>();
    private final Map<Integer, Entry<List<Station>>> catalogs = new ConcurrentHashMap<>();

    @Autowired
    public SofseArrivalsClient(@Value("${app.trenes.sofse-url:https://ariedro.dev/api-trenes}") String baseUrl,
                               ObjectMapper mapper) {
        this(baseUrl, mapper, Clock.systemUTC(), null);
    }

    SofseArrivalsClient(String baseUrl, ObjectMapper mapper, Clock clock, RestClient restClient) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.mapper = mapper;
        this.clock = clock;
        if (restClient != null) {
            this.restClient = restClient;
        } else {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(4_000);
            requestFactory.setReadTimeout(8_000);
            this.restClient = RestClient.builder().requestFactory(requestFactory)
                    .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
        }
    }

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    /**
     * La estacion de SOFSE que corresponde a una nuestra (por ubicacion),
     * dentro de las estaciones de la linea. Vacio si no hay ninguna cerca
     * o si no se pudieron pedir las estaciones.
     */
    public Optional<Integer> stationId(int gerencia, double latitude, double longitude) {
        Station station = SofseArrivals.nearest(catalog(gerencia), latitude, longitude, SofseArrivals.MAX_METERS);
        return Optional.ofNullable(station).map(Station::id);
    }

    /** Los ramales de una linea con sus alertas (no se guardan: las alertas cambian). Null si no respondio. */
    public JsonNode branches(int gerencia) {
        JsonNode node = get("/infraestructura/ramales?idGerencia=" + gerencia);
        return node != null && node.isArray() ? node : null;
    }

    /** Una estacion de SOFSE de la linea, por su numero (vacio si no esta o no se pudo pedir la lista). */
    public Optional<Station> station(int gerencia, int id) {
        return catalog(gerencia).stream().filter(s -> s.id() == id).findFirst();
    }

    /** Proximos trenes de una estacion de SOFSE, o vacio si la API no respondio. */
    public Optional<Snapshot> arrivals(int stationId) {
        Instant now = clock.instant();
        Entry<Snapshot> cached = arrivals.get(stationId);
        if (cached != null) {
            Duration maxAge = cached.value() == null ? FAILURE_BACKOFF : MAX_AGE;
            if (cached.at().plus(maxAge).isAfter(now)) {
                return Optional.ofNullable(cached.value());
            }
        }
        Snapshot snapshot = null;
        JsonNode root = get("/arribos/estacion/" + stationId + "?cantidad=" + REQUESTED);
        if (root != null && root.has("results")) {
            snapshot = new Snapshot(now, SofseArrivals.parse(root, now));
            health.ok(SourceHealth.Source.TRENES_SOFSE);
        } else if (root != null) {
            health.fail(SourceHealth.Source.TRENES_SOFSE, "formato inesperado");
        }
        arrivals.put(stationId, new Entry<>(now, snapshot));
        return Optional.ofNullable(snapshot);
    }

    /** Las estaciones de una linea (de todos sus ramales), guardadas un dia. */
    List<Station> catalog(int gerencia) {
        Instant now = clock.instant();
        Entry<List<Station>> cached = catalogs.get(gerencia);
        if (cached != null) {
            Duration maxAge = cached.value().isEmpty() ? CATALOG_BACKOFF : CATALOG_MAX_AGE;
            if (cached.at().plus(maxAge).isAfter(now)) {
                return cached.value();
            }
        }
        List<Station> stations = fetchCatalog(gerencia);
        // Si fallo y habia una lista vieja, se sigue usando: las estaciones casi no cambian.
        if (stations.isEmpty() && cached != null && !cached.value().isEmpty()) {
            catalogs.put(gerencia, new Entry<>(now.minus(CATALOG_MAX_AGE).plus(CATALOG_BACKOFF), cached.value()));
            return cached.value();
        }
        catalogs.put(gerencia, new Entry<>(now, stations));
        return stations;
    }

    private List<Station> fetchCatalog(int gerencia) {
        JsonNode branches = get("/infraestructura/ramales?idGerencia=" + gerencia);
        if (branches == null || !branches.isArray()) {
            return List.of();
        }
        Map<Integer, Station> byId = new LinkedHashMap<>();
        for (Integer branch : SofseArrivals.parseBranchIds(branches)) {
            JsonNode stations = get("/infraestructura/estaciones?idRamal=" + branch);
            if (stations == null || !stations.isArray()) {
                // Si falla un ramal se deja para mas tarde (no seguir esperando otros pedidos ni
                // quedarse un dia con la lista a medias).
                log.warn("Trenes (SOFSE): no se pudieron leer las estaciones de la gerencia {}.", gerencia);
                return List.of();
            }
            for (Station station : SofseArrivals.parseStations(stations)) {
                byId.putIfAbsent(station.id(), station);
            }
        }
        return new ArrayList<>(byId.values());
    }

    private JsonNode get(String path) {
        try {
            String body = restClient.get().uri(baseUrl + path).retrieve().body(String.class);
            return body == null ? null : mapper.readTree(body);
        } catch (RestClientException e) {
            health.fail(SourceHealth.Source.TRENES_SOFSE, e.getMostSpecificCause().getClass().getSimpleName());
            log.warn("Trenes (SOFSE) no respondio {} ({}).", path, e.getMostSpecificCause().getClass().getSimpleName());
            return null;
        } catch (IOException e) {
            health.fail(SourceHealth.Source.TRENES_SOFSE, "formato inesperado");
            log.warn("Trenes (SOFSE): respuesta ilegible en {}.", path);
            return null;
        }
    }
}
