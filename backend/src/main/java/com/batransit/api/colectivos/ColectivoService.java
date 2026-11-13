package com.batransit.api.colectivos;

import com.batransit.api.estado.MemoryReport;
import com.batransit.api.estado.SourceHealth;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.Catalog;
import com.batransit.api.config.TransporteApiProperties;
import com.batransit.api.exception.NotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Mantiene en memoria las lineas de colectivo, a partir del feed GTFS.
 *
 * Por defecto descarga el feed de la API Transporte con las mismas
 * credenciales que la sincronizacion de alertas. Con COLECTIVOS_GTFS_URL
 * se puede usar otra URL (por ejemplo, la del portal de datos abiertos).
 * Si la descarga falla, se conserva la ultima version cargada.
 */
@Service
public class ColectivoService {

    private static final Logger log = LoggerFactory.getLogger(ColectivoService.class);

    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }
    static final int MAX_RESULTS = 30;

    private final TransporteApiProperties apiProperties;
    private final String customUrl;
    private final String feedPath;
    private final GtfsColectivosParser parser;
    private final RestClient restClient;
    private final AtomicReference<Catalog> catalog = new AtomicReference<>();
    private final ColectivoSnapshotStore snapshotStore;
    /** Ultimo intento de bajar el feed, para no reintentar cada hora si falla. */
    private volatile Instant lastAttempt;
    static final Duration RETRY_AFTER_FAILURE = Duration.ofHours(6);

    /** Sin copia en la base (tests). */
    public ColectivoService(TransporteApiProperties apiProperties, String customUrl, String feedPath) {
        this(apiProperties, customUrl, feedPath, null);
    }

    @Autowired
    public ColectivoService(TransporteApiProperties apiProperties,
                            @Value("${app.colectivos.gtfs-url:}") String customUrl,
                            @Value("${app.colectivos.gtfs-path:/colectivos/feed-gtfs}") String feedPath,
                            ColectivoSnapshotStore snapshotStore) {
        this.apiProperties = apiProperties;
        this.snapshotStore = snapshotStore;
        this.customUrl = customUrl;
        this.feedPath = feedPath;
        this.parser = new GtfsColectivosParser();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) Duration.ofSeconds(15).toMillis());
        requestFactory.setReadTimeout((int) Duration.ofMinutes(5).toMillis());
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /** Descarga y procesa el feed. Si algo falla, se conserva lo que habia. */
    public void refresh() {
        lastAttempt = Instant.now();
        if (snapshotStore != null) {
            snapshotStore.markAttempt(lastAttempt);
        }
        Path file = null;
        try {
            MemoryReport.log("colectivos, antes de bajar el feed");
            file = Files.createTempFile("colectivos-gtfs", ".zip");
            download(file);
            log.info("Colectivos: feed GTFS bajado ({} MB).", Files.size(file) / (1024 * 1024));
            Catalog loaded = parser.parse(file);
            catalog.set(loaded);
            log.info("Colectivos: {} lineas cargadas desde el feed GTFS.", loaded.routes().size());
            MemoryReport.log("colectivos, despues de procesar el feed");
            health.ok(SourceHealth.Source.COLECTIVOS_RECORRIDOS);
            if (snapshotStore != null) {
                snapshotStore.save(loaded);
            }
        } catch (Exception e) {
            // Nunca se loguea la URL: puede llevar las credenciales.
            health.fail(SourceHealth.Source.COLECTIVOS_RECORRIDOS, e.getClass().getSimpleName());
            log.error("No se pudieron cargar los colectivos ({}). Se conserva la version anterior.",
                    e.getClass().getSimpleName());
        } finally {
            if (file != null) {
                try {
                    Files.deleteIfExists(file);
                } catch (IOException ignored) {
                    // Es un archivo temporal; el sistema lo limpia igual.
                }
            }
        }
    }

    private void download(Path target) {
        restClient.get().uri(feedUri()).exchange((request, response) -> {
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IOException("El feed GTFS respondio HTTP " + response.getStatusCode().value());
            }
            try (InputStream body = response.getBody()) {
                Files.copy(body, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return null;
        });
    }

    private URI feedUri() {
        if (customUrl != null && !customUrl.isBlank()) {
            return URI.create(customUrl);
        }
        return UriComponentsBuilder.fromUriString(apiProperties.getBaseUrl() + feedPath)
                .queryParam("client_id", apiProperties.getClientId())
                .queryParam("client_secret", apiProperties.getClientSecret())
                .encode()
                .build()
                .toUri();
    }

    /**
     * Carga la copia guardada en la base, si hay. Se llama al arrancar:
     * asi los colectivos estan disponibles en segundos, sin esperar al feed.
     */
    public void restoreSnapshot() {
        if (snapshotStore == null || catalog.get() != null) {
            return;
        }
        snapshotStore.load().ifPresent(saved -> {
            // Una copia guardada por una version anterior puede tener las letras sin adivinar ("MU?ECAS").
            catalog.compareAndSet(null, withLostLettersGuessed(saved));
            log.info("Colectivos: {} lineas cargadas desde la copia de la base (feed del {}).",
                    saved.routes().size(), saved.loadedAt());
        });
        // Si el ultimo intento de bajar el feed no termino (el servidor se reinicio en el
        // medio), no se reintenta enseguida: se espera RETRY_AFTER_FAILURE desde ese intento.
        snapshotStore.lastAttempt().ifPresent(at -> {
            if (lastAttempt == null || at.isAfter(lastAttempt)) {
                lastAttempt = at;
            }
        });
    }

    /** Si hace falta bajar el feed: no hay datos o los que hay tienen mas de maxAge. */
    public boolean needsRefresh(Duration maxAge, Instant now) {
        if (lastAttempt != null && lastAttempt.plus(RETRY_AFTER_FAILURE).isAfter(now)) {
            return false;
        }
        Catalog loaded = catalog.get();
        return loaded == null || loaded.loadedAt().plus(maxAge).isBefore(now);
    }

    /** La copia con los nombres de paradas y destinos con las letras perdidas adivinadas (TextRepair.fix). */
    static Catalog withLostLettersGuessed(Catalog catalog) {
        boolean any = catalog.routes().values().stream()
                .flatMap(r -> r.directions().stream())
                .anyMatch(d -> TextRepair.lostLetters(d.headsign())
                        || d.stops().stream().anyMatch(s -> TextRepair.lostLetters(s.name())));
        if (!any) {
            return catalog;
        }
        java.util.Map<String, BusRoute> routes = new java.util.LinkedHashMap<>();
        catalog.routes().forEach((id, r) -> routes.put(id, new BusRoute(r.id(), r.shortName(), r.longName(),
                r.agency(), r.color(), r.directions().stream()
                .map(d -> new BusModels.BusDirection(d.directionId(), TextRepair.fix(d.headsign()), d.shape(),
                        d.stops().stream()
                                .map(st -> new BusModels.BusStop(st.id(), TextRepair.fix(st.name()), st.latitude(),
                                        st.longitude()))
                                .toList(),
                        d.minutes()))
                .toList())));
        return new Catalog(routes, catalog.loadedAt());
    }

    /** Usado por los tests y por refresh(). */
    void load(Catalog loaded) {
        catalog.set(loaded);
    }

    public Optional<Catalog> current() {
        return Optional.ofNullable(catalog.get());
    }

    /**
     * Busca lineas por numero o nombre. "152" encuentra la 152 (y sus
     * ramales) antes que lineas que solo la contienen en el nombre.
     */
    public List<BusRoute> search(String query) {
        Catalog loaded = requireCatalog();
        String q = normalize(query);
        if (q.isEmpty()) {
            return List.of();
        }
        return loaded.routes().values().stream()
                .filter(r -> normalize(r.shortName()).startsWith(q) || normalize(r.longName()).contains(q))
                .sorted(Comparator
                        .comparing((BusRoute r) -> !normalize(r.shortName()).equals(q))
                        .thenComparing(r -> !normalize(r.shortName()).startsWith(q))
                        .thenComparing(r -> naturalKey(r.shortName()))
                        .thenComparing(BusRoute::longName))
                .limit(MAX_RESULTS)
                .toList();
    }

    /** Linea con parada cerca de un punto y a cuantos metros esta su parada mas cercana. */
    public record NearbyRoute(BusRoute route, int meters) {
    }

    /**
     * Lineas con alguna parada a menos de radiusMeters del punto, de la mas
     * cercana a la mas lejana. Se recorren las paradas de los recorridos ya
     * cargados en memoria (unas pocas centenas de miles de cuentas: milisegundos).
     */
    public List<NearbyRoute> near(double lat, double lon, int radiusMeters) {
        List<NearbyRoute> result = new java.util.ArrayList<>();
        for (BusRoute route : requireCatalog().routes().values()) {
            double best = Double.MAX_VALUE;
            for (var direction : route.directions()) {
                for (var stop : direction.stops()) {
                    best = Math.min(best, distanceMeters(lat, lon, stop.latitude(), stop.longitude()));
                }
            }
            if (best <= radiusMeters) {
                result.add(new NearbyRoute(route, (int) Math.round(best)));
            }
        }
        result.sort(Comparator.comparingInt(NearbyRoute::meters)
                .thenComparing(n -> naturalKey(n.route().shortName())));
        return result;
    }

    static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public BusRoute find(String routeId) {
        return find(routeId, null, null);
    }

    /**
     * Los otros carteles de la misma linea (la 42B si es la 42A). Si paran en
     * una parada lo decide StopMatcher (la misma parada o una al lado).
     */
    public List<BusRoute> otherSigns(BusRoute route) {
        String number = lineNumber(route.shortName());
        if (number.isEmpty()) {
            return List.of();
        }
        return requireCatalog().routes().values().stream()
                .filter(r -> !r.id().equals(route.id()) && number.equals(lineNumber(r.shortName())))
                .sorted(Comparator.comparing((BusRoute r) -> naturalKey(r.shortName())))
                .toList();
    }

    /** Las lineas con esos carteles ("303A", "163"): los otros colectivos favoritos de quien guardo una parada. */
    public List<BusRoute> routesNamed(java.util.Collection<String> shortNames) {
        java.util.Set<String> wanted = shortNames.stream().map(n -> normalize(n).replaceAll("\\s+", ""))
                .collect(java.util.stream.Collectors.toSet());
        if (wanted.isEmpty()) {
            return List.of();
        }
        return requireCatalog().routes().values().stream()
                .filter(r -> wanted.contains(normalize(r.shortName()).replaceAll("\\s+", "")))
                .sorted(Comparator.comparing((BusRoute r) -> naturalKey(r.shortName())))
                .toList();
    }

    /** El numero de la linea, sin el cartel: "42A" -> "42"; vacio si no empieza con un numero. */
    static String lineNumber(String shortName) {
        return normalize(shortName).replaceAll("\\s+", "").replaceAll("\\D.*", "");
    }

    /**
     * Busca una linea por id y, si no esta, por su numero. El feed en
     * vivo y el GTFS diario no siempre traen los mismos route_id (uno se
     * actualiza antes que el otro), y tocar un colectivo del mapa en vivo
     * terminaba en error. Con el numero ("53") y el destino del cartel se
     * elige la linea equivalente del GTFS.
     */
    public BusRoute find(String routeId, String line, String headsign) {
        Map<String, BusRoute> routes = requireCatalog().routes();
        BusRoute route = routes.get(routeId);
        if (route != null) {
            return route;
        }
        String wanted = normalize(line).replaceAll("\\s+", "");
        if (!wanted.isEmpty()) {
            String sign = normalize(headsign);
            Optional<BusRoute> match = routes.values().stream()
                    .filter(r -> normalize(r.shortName()).replaceAll("\\s+", "").equals(wanted))
                    .max(Comparator.comparingInt(r -> headsignScore(r, sign)));
            if (match.isEmpty()) {
                // "53A" en vivo y "53" en el GTFS (o al reves): se compara solo el numero.
                String digits = wanted.replaceAll("\\D.*", "");
                match = digits.isEmpty() ? Optional.empty() : routes.values().stream()
                        .filter(r -> normalize(r.shortName()).replaceAll("\\D.*", "").equals(digits))
                        .max(Comparator.comparingInt(r -> headsignScore(r, sign)));
            }
            if (match.isPresent()) {
                return match.get();
            }
        }
        throw new NotFoundException("No existe la línea de colectivo " + (line == null || line.isBlank() ? routeId : line));
    }

    /** 1 si algun sentido de la linea va hacia ese destino, 0 si no. */
    private static int headsignScore(BusRoute route, String sign) {
        if (sign.isEmpty()) {
            return 0;
        }
        return route.directions().stream()
                .map(d -> normalize(d.headsign()))
                .anyMatch(h -> !h.isEmpty() && (h.contains(sign) || sign.contains(h))) ? 1 : 0;
    }

    private Catalog requireCatalog() {
        Catalog loaded = catalog.get();
        if (loaded == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Los datos de colectivos todavía no están disponibles.");
        }
        return loaded;
    }

    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .trim().toLowerCase(Locale.ROOT);
    }

    /** Ordena "8" antes que "37" y "152": numeros de menor a mayor. */
    private static String naturalKey(String shortName) {
        String digits = shortName == null ? "" : shortName.replaceAll("\\D.*", "");
        return String.format("%06d%s", digits.isEmpty() ? 999999 : Integer.parseInt(digits.length() > 6 ? digits.substring(0, 6) : digits), shortName);
    }
}
