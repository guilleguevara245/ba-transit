package com.batransit.api.accesos;

import com.batransit.api.accesos.AccessModels.AccessDefinition;
import com.batransit.api.accesos.AccessModels.AccessReport;
import com.batransit.api.accesos.AccessModels.AccessesResponse;
import com.batransit.api.accesos.AccessModels.Definitions;
import com.batransit.api.accesos.AccessModels.FlowData;
import com.batransit.api.accesos.AccessModels.SegmentDefinition;
import com.batransit.api.accesos.AccessModels.SegmentReport;
import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Estado del transito en los accesos a la Ciudad.
 *
 * Se mide con TomTom en dos tramos por acceso. Para respetar el plan
 * gratuito (20.000 consultas por mes) el resultado se guarda CACHE_TTL:
 * como mucho 8 puntos x 72 veces por dia = 576 consultas diarias.
 * Las consultas se hacen solo cuando alguien pide la pagina. Si un punto
 * cae fuera de la autopista se buscan puntos cercanos una sola vez (como
 * mucho 16 consultas por tramo) y se recuerda el que funciono.
 */
@Service
public class AccessService {

    private static final Logger log = LoggerFactory.getLogger(AccessService.class);

    static final Duration CACHE_TTL = Duration.ofMinutes(20);

    /** Clases de ruta de TomTom que corresponden a autopistas y rutas principales. */
    private static final Set<String> HIGHWAY_CLASSES = Set.of("FRC0", "FRC1", "FRC2");

    /**
     * Velocidad sin transito minima para aceptar un tramo como autopista.
     * Una colectora o calle lateral puede venir con clase alta, pero su
     * velocidad normal la delata (30-40 km/h).
     */
    static final double MIN_HIGHWAY_SPEED = 50;

    /** Con esta velocidad normal el tramo es autopista aunque TomTom le de una clase menor. */
    static final double SURE_HIGHWAY_SPEED = 70;

    private final List<AccessDefinition> definitions;
    private final TomTomTrafficClient client;
    private final Clock clock;

    static final Duration SEARCH_RETRY = Duration.ofHours(24);

    private AccessesResponse cached;
    private Instant cachedAt;

    /** Puntos ajustados por searchNearby, por nombre de tramo. */
    private final Map<String, double[]> resolvedPoints = new HashMap<>();
    /** Ultima busqueda sin resultado, por nombre de tramo. */
    private final Map<String, Instant> failedSearches = new HashMap<>();

    @Autowired
    public AccessService(ObjectMapper objectMapper, TomTomTrafficClient client) {
        this(loadDefinitions(objectMapper), client, Clock.systemUTC());
    }

    AccessService(List<AccessDefinition> definitions, TomTomTrafficClient client, Clock clock) {
        this.definitions = definitions;
        this.client = client;
        this.clock = clock;
    }

    static List<AccessDefinition> loadDefinitions(ObjectMapper objectMapper) {
        try (InputStream input = new ClassPathResource("accesos.json").getInputStream()) {
            return objectMapper.readValue(input, Definitions.class).accesses();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer accesos.json", e);
        }
    }

    public synchronized AccessesResponse report() {
        if (!client.isConfigured()) {
            return new AccessesResponse(false, null, definitions.stream()
                    .map(a -> toReport(a, a.segments().stream().map(s -> unknown(s.name())).toList()))
                    .toList());
        }

        Instant now = clock.instant();
        if (cached != null && cachedAt.plus(CACHE_TTL).isAfter(now)) {
            return cached;
        }

        List<AccessReport> accesses = definitions.stream()
                .map(a -> toReport(a, a.segments().stream().map(this::measure).toList()))
                .toList();
        cached = new AccessesResponse(true, now, accesses);
        cachedAt = now;
        return cached;
    }

    private SegmentReport measure(SegmentDefinition segment) {
        double[] point = resolvedPoints.getOrDefault(segment.name(),
                new double[] {segment.lat(), segment.lon()});
        Optional<FlowData> flow = client.flowAt(point[0], point[1]);
        if (flow.isEmpty()) {
            return unknown(segment.name());
        }
        FlowData data = flow.get();
        if (!isHighway(data) && !resolvedPoints.containsKey(segment.name())) {
            Optional<FlowData> found = searchNearby(segment);
            if (found.isPresent()) {
                data = found.get();
            }
        }
        boolean onHighway = isHighway(data);
        return new SegmentReport(
                segment.name(),
                onHighway ? classify(data) : TrafficStatus.SIN_DATOS,
                (int) Math.round(data.currentSpeed()),
                (int) Math.round(data.freeFlowSpeed()),
                !onHighway,
                data.geometry());
    }

    /**
     * Si el punto de accesos.json cae sobre una calle cercana en vez de la
     * autopista, prueba puntos alrededor (primero a ~400 m, despues a
     * ~800 m) y se queda con el primero que de la autopista. El punto
     * encontrado se recuerda para las proximas mediciones y se loguea
     * para poder pasarlo a accesos.json. Si no aparece ninguno, no se
     * vuelve a buscar ese tramo hasta SEARCH_RETRY, para cuidar el
     * cupo gratuito de TomTom.
     */
    private Optional<FlowData> searchNearby(SegmentDefinition segment) {
        Instant now = clock.instant();
        Instant lastFailure = failedSearches.get(segment.name());
        if (lastFailure != null && lastFailure.plus(SEARCH_RETRY).isAfter(now)) {
            return Optional.empty();
        }
        for (double[] offset : SEARCH_OFFSETS) {
            double lat = segment.lat() + offset[0];
            double lon = segment.lon() + offset[1];
            Optional<FlowData> flow = client.flowAt(lat, lon);
            if (flow.isPresent() && isHighway(flow.get())) {
                resolvedPoints.put(segment.name(), new double[] {lat, lon});
                failedSearches.remove(segment.name());
                log.info("Accesos: el tramo '{}' se mide en {}, {} (punto ajustado; conviene pasarlo a accesos.json)",
                        segment.name(), String.format(Locale.ROOT, "%.5f", lat), String.format(Locale.ROOT, "%.5f", lon));
                return flow;
            }
        }
        failedSearches.put(segment.name(), now);
        log.warn("Accesos: no se encontro la autopista cerca del tramo '{}'; revisar sus coordenadas en accesos.json",
                segment.name());
        return Optional.empty();
    }

    /** Desplazamientos (lat, lon) en grados: 8 direcciones a ~400 m y despues a ~800 m. */
    static final List<double[]> SEARCH_OFFSETS = buildOffsets();

    private static List<double[]> buildOffsets() {
        List<double[]> offsets = new ArrayList<>();
        for (double distance : new double[] {0.0036, 0.0072}) {
            for (int i = 0; i < 8; i++) {
                double angle = Math.PI / 4 * i;
                // 1 grado de longitud mide menos que uno de latitud a esta altura (cos 34.6 = 0.82).
                offsets.add(new double[] {distance * Math.sin(angle), distance * Math.cos(angle) / 0.82});
            }
        }
        return List.copyOf(offsets);
    }

    /** Si el tramo que devolvio TomTom es la autopista y no una calle cercana. */
    static boolean isHighway(FlowData data) {
        if (data.freeFlowSpeed() >= SURE_HIGHWAY_SPEED) {
            return true;
        }
        return HIGHWAY_CLASSES.contains(data.frc()) && data.freeFlowSpeed() >= MIN_HIGHWAY_SPEED;
    }

    /**
     * Estado segun la relacion entre la velocidad actual y la velocidad
     * sin transito del tramo.
     */
    static TrafficStatus classify(FlowData data) {
        if (data.roadClosure()) {
            return TrafficStatus.CORTADO;
        }
        if (data.freeFlowSpeed() <= 0) {
            return TrafficStatus.SIN_DATOS;
        }
        double ratio = data.currentSpeed() / data.freeFlowSpeed();
        if (ratio >= 0.75) {
            return TrafficStatus.FLUIDO;
        }
        if (ratio >= 0.45) {
            return TrafficStatus.DEMORADO;
        }
        return TrafficStatus.CONGESTIONADO;
    }

    private static SegmentReport unknown(String name) {
        return new SegmentReport(name, TrafficStatus.SIN_DATOS, null, null, false, List.of());
    }

    private static AccessReport toReport(AccessDefinition a, List<SegmentReport> segments) {
        return new AccessReport(a.id(), a.name(), a.road(), a.connects(), a.operator(), segments);
    }
}
