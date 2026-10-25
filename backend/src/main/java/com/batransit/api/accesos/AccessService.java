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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Estado del transito en los accesos a la Ciudad.
 *
 * Se mide con TomTom en dos tramos por acceso. Para respetar el plan
 * gratuito (20.000 consultas por mes) el resultado se guarda CACHE_TTL:
 * como mucho 8 puntos x 72 veces por dia = 576 consultas diarias.
 * Las consultas se hacen solo cuando alguien pide la pagina.
 */
@Service
public class AccessService {

    static final Duration CACHE_TTL = Duration.ofMinutes(20);

    /** Clases de ruta de TomTom que corresponden a autopistas y rutas principales. */
    private static final Set<String> HIGHWAY_CLASSES = Set.of("FRC0", "FRC1", "FRC2");

    private final List<AccessDefinition> definitions;
    private final TomTomTrafficClient client;
    private final Clock clock;

    private AccessesResponse cached;
    private Instant cachedAt;

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
        Optional<FlowData> flow = client.flowAt(segment.lat(), segment.lon());
        if (flow.isEmpty()) {
            return unknown(segment.name());
        }
        FlowData data = flow.get();
        boolean onHighway = HIGHWAY_CLASSES.contains(data.frc());
        return new SegmentReport(
                segment.name(),
                onHighway ? classify(data) : TrafficStatus.SIN_DATOS,
                (int) Math.round(data.currentSpeed()),
                (int) Math.round(data.freeFlowSpeed()),
                !onHighway,
                data.geometry());
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
