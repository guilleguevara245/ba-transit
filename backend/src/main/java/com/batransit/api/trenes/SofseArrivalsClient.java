package com.batransit.api.trenes;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.trenes.SofseArrivals.LiveTrain;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

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

    /** Los trenes andando de una linea, con su posicion; fetchedAt: el pedido mas viejo que se uso. */
    public record LiveSnapshot(Instant fetchedAt, List<LiveTrain> trains) {
    }

    /** Para ver los trenes andando se piden mas arribos (en el tronco del Roca pasan muchos ramales). */
    static final int LIVE_REQUESTED = 30;
    /** Cuantos pedidos de trenes andando a la vez, como mucho. */
    static final int LIVE_PARALLEL = 4;

    private record Entry<T>(Instant at, T value) {
    }

    private final String baseUrl;
    private final RestClient restClient;
    private final ObjectMapper mapper;
    private final Clock clock;
    private SourceHealth health = SourceHealth.NOOP;

    /** Cuantas leyendas de ejemplo se anotan en el log (para ver su formato, no todas). */
    static final int LEGEND_SAMPLES = 20;

    private final Map<Integer, Entry<Snapshot>> arrivals = new ConcurrentHashMap<>();
    /** Tipos de servicio y leyendas ya anotados en el log (desde que arranco el servicio). */
    private final Set<String> seenTypes = ConcurrentHashMap.newKeySet();
    private final Set<String> seenLegends = ConcurrentHashMap.newKeySet();
    private final Map<Integer, Entry<List<Station>>> catalogs = new ConcurrentHashMap<>();
    /** Por linea: las estaciones donde mirar los trenes andando (unas por ramal), con el catalogo. */
    private final Map<Integer, List<Integer>> watched = new ConcurrentHashMap<>();
    private final Map<Integer, Entry<List<LiveTrain>>> live = new ConcurrentHashMap<>();
    private final ExecutorService liveFetcher =
            Executors.newFixedThreadPool(LIVE_PARALLEL, Thread.ofVirtual().name("sofse-vivo-", 0).factory());

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
            noteServiceTypes(root);
            snapshot = new Snapshot(now, SofseArrivals.parse(root, now));
            health.ok(SourceHealth.Source.TRENES_SOFSE);
        } else if (root != null) {
            health.fail(SourceHealth.Source.TRENES_SOFSE, "formato inesperado");
        }
        arrivals.put(stationId, new Entry<>(now, snapshot));
        return Optional.ofNullable(snapshot);
    }

    /**
     * Anota en el log cada tipo de servicio que aparece por primera vez (por
     * linea) y algunas leyendas de ejemplo: la API no documenta que valores
     * pueden venir, asi se ve cuales existen (en Render: buscar "tipo de servicio").
     */
    private void noteServiceTypes(JsonNode root) {
        for (String type : SofseArrivals.serviceTypes(root)) {
            if (seenTypes.add(type)) {
                log.info("Trenes (SOFSE): tipo de servicio nuevo -> {}", type);
            }
        }
        for (String legend : SofseArrivals.legends(root)) {
            if (seenLegends.size() < LEGEND_SAMPLES && seenLegends.add(legend)) {
                log.info("Trenes (SOFSE): leyenda de ejemplo -> {}", legend);
            }
        }
    }

    /**
     * Los trenes andando de una linea, con su posicion en vivo: se miran
     * unas estaciones por ramal (ver SofseArrivals.watchStations) y se junta
     * lo que traen, sin repetir. Las que hay que volver a pedir se piden de
     * a LIVE_PARALLEL a la vez. Vacio si no se pudo pedir nada.
     */
    public Optional<LiveSnapshot> liveTrains(int gerencia) {
        catalog(gerencia);
        List<Integer> stations = watched.getOrDefault(gerencia, List.of());
        List<Future<Entry<List<LiveTrain>>>> pending = new ArrayList<>();
        for (Integer station : stations) {
            pending.add(liveFetcher.submit(() -> liveAt(station)));
        }
        Map<String, LiveTrain> byId = new LinkedHashMap<>();
        Instant oldest = null;
        for (Future<Entry<List<LiveTrain>>> future : pending) {
            Entry<List<LiveTrain>> entry = result(future);
            if (entry == null || entry.value() == null) {
                continue;
            }
            oldest = oldest == null || entry.at().isBefore(oldest) ? entry.at() : oldest;
            for (LiveTrain train : entry.value()) {
                byId.putIfAbsent(train.id(), train);
            }
        }
        return oldest == null ? Optional.empty() : Optional.of(new LiveSnapshot(oldest, List.copyOf(byId.values())));
    }

    private static <T> T result(Future<T> future) {
        try {
            return future.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (ExecutionException e) {
            log.warn("Trenes (SOFSE): fallo un pedido de trenes andando: {}", e.getCause().toString());
            return null;
        }
    }

    private Entry<List<LiveTrain>> liveAt(int stationId) {
        Instant now = clock.instant();
        Entry<List<LiveTrain>> cached = live.get(stationId);
        if (cached != null) {
            Duration maxAge = cached.value() == null ? FAILURE_BACKOFF : MAX_AGE;
            if (cached.at().plus(maxAge).isAfter(now)) {
                return cached;
            }
        }
        JsonNode root = get("/arribos/estacion/" + stationId + "?cantidad=" + LIVE_REQUESTED);
        List<LiveTrain> trains = root != null && root.has("results") ? SofseArrivals.liveTrains(root, now) : null;
        Entry<List<LiveTrain>> entry = new Entry<>(now, trains);
        live.put(stationId, entry);
        return entry;
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
        Set<Integer> watch = new LinkedHashSet<>();
        for (Integer branch : SofseArrivals.parseBranchIds(branches)) {
            JsonNode stations = get("/infraestructura/estaciones?idRamal=" + branch);
            if (stations == null || !stations.isArray()) {
                // Si falla un ramal se deja para mas tarde (no seguir esperando otros pedidos ni
                // quedarse un dia con la lista a medias).
                log.warn("Trenes (SOFSE): no se pudieron leer las estaciones de la gerencia {}.", gerencia);
                return List.of();
            }
            List<Station> branchStations = SofseArrivals.parseStations(stations);
            for (Station station : branchStations) {
                byId.putIfAbsent(station.id(), station);
            }
            watch.addAll(SofseArrivals.watchStations(branchStations));
        }
        watched.put(gerencia, List.copyOf(watch));
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
