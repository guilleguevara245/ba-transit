package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.Catalog;
import com.batransit.api.config.TransporteApiProperties;
import com.batransit.api.exception.NotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
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
    static final int MAX_RESULTS = 30;

    private final TransporteApiProperties apiProperties;
    private final String customUrl;
    private final String feedPath;
    private final GtfsColectivosParser parser;
    private final RestClient restClient;
    private final AtomicReference<Catalog> catalog = new AtomicReference<>();

    public ColectivoService(TransporteApiProperties apiProperties,
                            @Value("${app.colectivos.gtfs-url:}") String customUrl,
                            @Value("${app.colectivos.gtfs-path:/colectivos/feed-gtfs}") String feedPath) {
        this.apiProperties = apiProperties;
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
        Path file = null;
        try {
            file = Files.createTempFile("colectivos-gtfs", ".zip");
            download(file);
            Catalog loaded = parser.parse(file);
            catalog.set(loaded);
            log.info("Colectivos: {} lineas cargadas desde el feed GTFS.", loaded.routes().size());
        } catch (Exception e) {
            // Nunca se loguea la URL: puede llevar las credenciales.
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

    public BusRoute find(String routeId) {
        BusRoute route = requireCatalog().routes().get(routeId);
        if (route == null) {
            throw new NotFoundException("No existe la línea de colectivo " + routeId);
        }
        return route;
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
