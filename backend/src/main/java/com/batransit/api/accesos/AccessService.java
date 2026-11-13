package com.batransit.api.accesos;

import com.batransit.api.accesos.AccessModels.AccessDefinition;
import com.batransit.api.accesos.AccessModels.AccessReport;
import com.batransit.api.accesos.AccessModels.AccessesResponse;
import com.batransit.api.accesos.AccessModels.Definitions;
import com.batransit.api.accesos.AccessModels.DirectionDefinition;
import com.batransit.api.accesos.AccessModels.DirectionReport;
import com.batransit.api.accesos.AccessModels.FlowData;
import com.batransit.api.accesos.AccessModels.Incident;
import com.batransit.api.accesos.AccessModels.IncidentCheck;
import com.batransit.api.accesos.AccessModels.IncidentsResponse;
import com.batransit.api.accesos.AccessModels.Jam;
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
 * Se mide con TomTom en dos tramos por acceso, cada uno en sus dos manos
 * (hacia CABA y hacia Provincia). El plan gratuito de Traffic Flow da
 * 20.000 consultas por mes: el resultado se guarda CACHE_TTL y, ademas,
 * hay un tope de DAILY_BUDGET consultas por dia (unas 19.200 por mes).
 * Con poco uso se mide cada 20 minutos; si la pagina se consulta todo el
 * dia, al llegar al tope se sigue mostrando la ultima medicion.
 * Las consultas se hacen solo cuando alguien pide la pagina. Si un punto
 * cae fuera de la autopista se buscan puntos cercanos una sola vez (como
 * mucho 16 consultas por tramo) y se recuerda el que funciono.
 *
 * Un punto por mano no ve un embotellamiento que esta en otra parte del
 * tramo. Por eso cada medicion pide tambien los embotellamientos de toda la
 * zona (Traffic Incidents, una consulta, con su propio cupo gratuito de
 * 2.500 por mes) y los asigna a la mano de su acceso: por el numero de ruta,
 * el tramo mas cercano y el sentido en que avanza.
 */
@Service
public class AccessService {

    private static final Logger log = LoggerFactory.getLogger(AccessService.class);

    static final Duration CACHE_TTL = Duration.ofMinutes(20);

    /** Consultas a TomTom por dia (hora de Buenos Aires): 640 x 30 = 19.200, debajo de las 20.000 gratis. */
    static final int DAILY_BUDGET = 640;
    private static final java.time.ZoneId BUENOS_AIRES = java.time.ZoneId.of("America/Argentina/Buenos_Aires");
    private java.time.LocalDate budgetDay;
    private int callsToday;

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

    /** Consultas de embotellamientos por dia: 80 x 31 = 2.480, debajo de las 2.500 gratis por mes. */
    static final int INCIDENT_DAILY_BUDGET = 80;
    private java.time.LocalDate incidentBudgetDay;
    private int incidentCallsToday;

    /** Un embotellamiento cuenta desde este largo y esta demora (los mas chicos son ruido). */
    static final int MIN_JAM_METERS = 500;
    static final int MIN_JAM_DELAY_SECONDS = 60;

    /** Un embotellamiento se asigna al tramo mas cercano si esta a menos de esto de su punto. */
    static final double MAX_SEGMENT_DISTANCE_METERS = 12_000;

    /** El Obelisco: una mano va "hacia CABA" si al avanzar se acerca. */
    static final double[] CITY_CENTER = {-34.6037, -58.3816};

    /** Los incidentes de la ultima medicion y donde se asignaron (para revisar la asignacion). */
    private List<IncidentCheck> lastIncidents = List.of();

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
        if (cached != null && callsToday(now) + pointCount() > DAILY_BUDGET) {
            // Tope diario alcanzado: se mantiene la ultima medicion hasta mañana.
            return cached;
        }

        List<Incident> incidents = fetchIncidents(now);
        List<IncidentCheck> checks = new ArrayList<>();
        Map<String, List<Jam>> jams = assignJams(definitions, incidents, checks);
        lastIncidents = List.copyOf(checks);
        List<AccessReport> accesses = definitions.stream()
                .map(a -> toReport(a, mergeSameSegment(a.segments().stream()
                        .map(s -> withJams(measure(s), a.id(), jams)).toList())))
                .toList();
        cached = new AccessesResponse(true, now, accesses);
        cachedAt = now;
        return cached;
    }

    /** Los incidentes de la ultima medicion, con el acceso, tramo y mano a que se asignaron. */
    public synchronized IncidentsResponse incidents() {
        report();
        return new IncidentsResponse(cachedAt, lastIncidents);
    }

    /**
     * Los embotellamientos de la zona de los accesos; vacio sin cupo, si
     * TomTom no responde o si ningun acceso tiene sus numeros de ruta (sin
     * ellos no se pueden asignar).
     */
    private List<Incident> fetchIncidents(Instant now) {
        if (definitions.stream().allMatch(a -> a.roadNumbers().isEmpty())) {
            return List.of();
        }
        java.time.LocalDate today = now.atZone(BUENOS_AIRES).toLocalDate();
        if (!today.equals(incidentBudgetDay)) {
            incidentBudgetDay = today;
            incidentCallsToday = 0;
        }
        if (incidentCallsToday >= INCIDENT_DAILY_BUDGET) {
            return List.of();
        }
        incidentCallsToday++;
        double[] box = boundingBox(definitions);
        return client.incidentsIn(box[0], box[1], box[2], box[3]).orElse(List.of());
    }

    /** Rectangulo (minLat, minLon, maxLat, maxLon) de todos los puntos medidos, con ~8 km de margen. */
    static double[] boundingBox(List<AccessDefinition> definitions) {
        double minLat = 90;
        double minLon = 180;
        double maxLat = -90;
        double maxLon = -180;
        for (AccessDefinition access : definitions) {
            for (SegmentDefinition segment : access.segments()) {
                minLat = Math.min(minLat, segment.lat());
                maxLat = Math.max(maxLat, segment.lat());
                minLon = Math.min(minLon, segment.lon());
                maxLon = Math.max(maxLon, segment.lon());
            }
        }
        double margin = 0.08;
        return new double[] {minLat - margin, minLon - margin, maxLat + margin, maxLon + margin};
    }

    /**
     * Reparte los embotellamientos entre las manos: clave "acceso|tramo|hacia".
     * En checks deja cada incidente con donde se asigno (o sin asignar).
     */
    static Map<String, List<Jam>> assignJams(List<AccessDefinition> definitions, List<Incident> incidents,
                                             List<IncidentCheck> checks) {
        Map<String, List<Jam>> result = new HashMap<>();
        for (Incident incident : incidents) {
            String accessId = null;
            String segmentName = null;
            String towards = null;
            if (incident.category() == 6 && incident.geometry().size() >= 2
                    && incident.lengthMeters() >= MIN_JAM_METERS && incident.delaySeconds() >= MIN_JAM_DELAY_SECONDS) {
                for (AccessDefinition access : definitions) {
                    if (!sameRoad(access.roadNumbers(), incident.roadNumbers())) {
                        continue;
                    }
                    SegmentDefinition segment = nearestSegment(access, incident.geometry());
                    if (segment != null) {
                        accessId = access.id();
                        segmentName = segment.name();
                        towards = towards(incident.geometry());
                        break;
                    }
                }
            }
            if (accessId != null) {
                result.computeIfAbsent(accessId + "|" + segmentName + "|" + towards, k -> new ArrayList<>())
                        .add(new Jam(incident.lengthMeters(), incident.delaySeconds(), incident.from(), incident.to(),
                                incident.magnitude()));
            }
            List<double[]> g = incident.geometry();
            checks.add(new IncidentCheck(incident.category(), incident.magnitude(), incident.from(), incident.to(),
                    incident.lengthMeters(), incident.delaySeconds(), incident.roadNumbers(),
                    g.isEmpty() ? null : g.get(0), g.isEmpty() ? null : g.get(g.size() - 1),
                    accessId, segmentName, towards));
        }
        return result;
    }

    /** "AU09", "AU 9" y "au-9" son la misma ruta (TomTom escribe "AU09", "RN-01", "RN-A002"). */
    static boolean sameRoad(List<String> accessRoads, List<String> incidentRoads) {
        for (String a : accessRoads) {
            for (String b : incidentRoads) {
                if (roadKey(a).equals(roadKey(b)) && !roadKey(a).isEmpty()) {
                    return true;
                }
            }
        }
        return false;
    }

    private static String roadKey(String road) {
        return road == null ? "" : road.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "")
                .replaceAll("(?<=[A-Z])0+(?=\\d)", "");
    }

    /** El tramo del acceso mas cercano a la mitad del embotellamiento; null si todos quedan lejos. */
    static SegmentDefinition nearestSegment(AccessDefinition access, List<double[]> geometry) {
        double[] middle = geometry.get(geometry.size() / 2);
        SegmentDefinition best = null;
        double bestMeters = MAX_SEGMENT_DISTANCE_METERS;
        for (SegmentDefinition segment : access.segments()) {
            double meters = meters(middle, new double[] {segment.lat(), segment.lon()});
            if (meters < bestMeters) {
                bestMeters = meters;
                best = segment;
            }
        }
        return best;
    }

    /** "CABA" si el embotellamiento avanza hacia el centro; si no, "Provincia". */
    static String towards(List<double[]> geometry) {
        double start = meters(geometry.get(0), CITY_CENTER);
        double end = meters(geometry.get(geometry.size() - 1), CITY_CENTER);
        return end < start ? "CABA" : "Provincia";
    }

    static double meters(double[] a, double[] b) {
        double dLat = Math.toRadians(b[0] - a[0]);
        double dLon = Math.toRadians(b[1] - a[1]);
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Math.toRadians(a[0]))
                * Math.cos(Math.toRadians(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    /**
     * Suma a cada mano sus embotellamientos y sube su estado si hace falta:
     * uno grave la deja congestionada; uno leve o moderado, por lo menos
     * demorada. El tramo queda con la mano mas complicada.
     */
    static SegmentReport withJams(SegmentReport segment, String accessId, Map<String, List<Jam>> jams) {
        if (segment.directions().isEmpty()) {
            return segment;
        }
        List<DirectionReport> directions = new ArrayList<>();
        boolean changed = false;
        for (DirectionReport d : segment.directions()) {
            List<Jam> list = jams.getOrDefault(accessId + "|" + segment.name() + "|" + d.towards(), List.of());
            if (list.isEmpty()) {
                directions.add(d);
                continue;
            }
            changed = true;
            TrafficStatus status = d.status();
            for (Jam jam : list) {
                TrafficStatus byJam = jam.magnitude() >= 3 ? TrafficStatus.CONGESTIONADO : TrafficStatus.DEMORADO;
                if (severity(byJam) > severity(status)) {
                    status = byJam;
                }
            }
            directions.add(new DirectionReport(d.towards(), status, d.currentSpeed(), d.freeFlowSpeed(), d.geometry(),
                    list));
        }
        if (!changed) {
            return segment;
        }
        DirectionReport worst = worst(directions);
        return new SegmentReport(segment.name(), worst.status(), worst.currentSpeed(), worst.freeFlowSpeed(),
                segment.checkLocation(), worst.geometry().isEmpty() ? segment.geometry() : worst.geometry(), directions);
    }

    private SegmentReport measure(SegmentDefinition segment) {
        if (!segment.directions().isEmpty()) {
            return measureDirections(segment);
        }
        double[] point = resolvedPoints.getOrDefault(segment.name(),
                new double[] {segment.lat(), segment.lon()});
        Optional<FlowData> flow = flowAt(point[0], point[1]);
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
     * Si dos tramos seguidos del mismo acceso caen en el mismo tramo de
     * TomTom (pasa en el Acceso Oeste: TomTom informa un unico promedio
     * entre Moreno y la General Paz), se muestran como uno solo
     * ("General Paz – Moreno") en vez de repetir el mismo dato dos veces.
     */
    static List<SegmentReport> mergeSameSegment(List<SegmentReport> segments) {
        List<SegmentReport> result = new ArrayList<>();
        for (SegmentReport segment : segments) {
            SegmentReport last = result.isEmpty() ? null : result.get(result.size() - 1);
            if (last != null && sameTomTomSegment(last, segment)) {
                result.set(result.size() - 1, merge(last, segment));
            } else {
                result.add(segment);
            }
        }
        return result;
    }

    /**
     * Dos tramos con el mismo dato de TomTom en uno: las velocidades son las
     * del primero (son las mismas) y cada mano junta los embotellamientos
     * de los dos, con el estado mas complicado.
     */
    private static SegmentReport merge(SegmentReport first, SegmentReport second) {
        List<DirectionReport> directions = new ArrayList<>();
        for (int i = 0; i < first.directions().size(); i++) {
            DirectionReport a = first.directions().get(i);
            DirectionReport b = second.directions().get(i);
            List<Jam> jams = new ArrayList<>(a.jams());
            jams.addAll(b.jams());
            TrafficStatus status = severity(b.status()) > severity(a.status()) ? b.status() : a.status();
            directions.add(new DirectionReport(a.towards(), status, a.currentSpeed(), a.freeFlowSpeed(), a.geometry(),
                    jams));
        }
        DirectionReport worst = worst(directions);
        TrafficStatus status = worst == null ? first.status() : worst.status();
        return new SegmentReport(joinNames(first.name(), second.name()), status, first.currentSpeed(),
                first.freeFlowSpeed(), first.checkLocation(), first.geometry(), directions);
    }

    private static boolean sameTomTomSegment(SegmentReport a, SegmentReport b) {
        if (a.directions().isEmpty() || a.directions().size() != b.directions().size()) {
            return false;
        }
        for (int i = 0; i < a.directions().size(); i++) {
            DirectionReport x = a.directions().get(i);
            DirectionReport y = b.directions().get(i);
            if (x.geometry().size() < 2 || y.geometry().size() < 2
                    || !near(x.geometry().get(0), y.geometry().get(0))
                    || !near(x.geometry().get(x.geometry().size() - 1), y.geometry().get(y.geometry().size() - 1))) {
                return false;
            }
        }
        return true;
    }

    /** Menos de ~50 m entre dos puntos. */
    private static boolean near(double[] p, double[] q) {
        return Math.abs(p[0] - q[0]) < 0.0005 && Math.abs(p[1] - q[1]) < 0.0006;
    }

    /** "General Paz – Morón" + "Ituzaingó – Moreno" = "General Paz – Moreno". */
    static String joinNames(String first, String second) {
        String[] a = first.split(" – ");
        String[] b = second.split(" – ");
        if (a.length < 2 || b.length < 2) {
            return first + " / " + second;
        }
        return a[0] + " – " + b[b.length - 1];
    }

    /** Consulta a TomTom contando la consulta para el tope diario. */
    private Optional<FlowData> flowAt(double lat, double lon) {
        callsToday(clock.instant());
        callsToday++;
        return client.flowAt(lat, lon);
    }

    /** Consultas hechas hoy (reinicia el contador al cambiar el dia). */
    private int callsToday(Instant now) {
        java.time.LocalDate today = now.atZone(BUENOS_AIRES).toLocalDate();
        if (!today.equals(budgetDay)) {
            budgetDay = today;
            callsToday = 0;
        }
        return callsToday;
    }

    /** Consultas que hace una medicion completa. */
    private int pointCount() {
        int count = 0;
        for (AccessDefinition access : definitions) {
            for (SegmentDefinition segment : access.segments()) {
                count += segment.directions().isEmpty() ? 1 : segment.directions().size();
            }
        }
        return count;
    }

    /**
     * Mide cada mano en su punto (puntos tomados del trazado de OpenStreetMap,
     * sobre cada calzada) y resume el tramo con la mano mas complicada.
     */
    private SegmentReport measureDirections(SegmentDefinition segment) {
        List<DirectionReport> directions = segment.directions().stream().map(this::measureDirection).toList();
        DirectionReport worst = worst(directions);
        if (worst == null) {
            return new SegmentReport(segment.name(), TrafficStatus.SIN_DATOS, null, null, false, List.of(), directions);
        }
        return new SegmentReport(segment.name(), worst.status(), worst.currentSpeed(), worst.freeFlowSpeed(),
                false, worst.geometry(), directions);
    }

    private DirectionReport measureDirection(DirectionDefinition direction) {
        Optional<FlowData> flow = flowAt(direction.lat(), direction.lon());
        if (flow.isEmpty() || !isHighway(flow.get())) {
            return new DirectionReport(direction.towards(), TrafficStatus.SIN_DATOS, null, null, List.of());
        }
        FlowData data = flow.get();
        return new DirectionReport(direction.towards(), classify(data),
                (int) Math.round(data.currentSpeed()), (int) Math.round(data.freeFlowSpeed()), data.geometry());
    }

    /** La mano en peor estado (cortado, congestionado, demorado, fluido); null si ninguna tiene datos. */
    static DirectionReport worst(List<DirectionReport> directions) {
        DirectionReport worst = null;
        for (DirectionReport d : directions) {
            if (d.status() == TrafficStatus.SIN_DATOS) {
                continue;
            }
            if (worst == null || severity(d.status()) > severity(worst.status())) {
                worst = d;
            }
        }
        return worst;
    }

    private static int severity(TrafficStatus status) {
        return switch (status) {
            case CORTADO -> 4;
            case CONGESTIONADO -> 3;
            case DEMORADO -> 2;
            case FLUIDO -> 1;
            case SIN_DATOS -> 0;
        };
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
            Optional<FlowData> flow = flowAt(lat, lon);
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
