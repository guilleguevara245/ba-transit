package com.batransit.api.notificaciones;

import com.batransit.api.accesos.AccessModels.AccessReport;
import com.batransit.api.accesos.AccessModels.AccessesResponse;
import com.batransit.api.accesos.AccessModels.DirectionReport;
import com.batransit.api.accesos.AccessModels.SegmentReport;
import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.batransit.api.domain.AlertType;
import com.batransit.api.notificaciones.NotificationPlanner.StationInfo;
import com.batransit.api.notificaciones.NotificationPlanner.Subscriber;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * El resumen diario: un solo aviso con el estado de todos los favoritos.
 * "Buen día, Guille: 2 problemas en tus favoritos" con los problemas, o
 * "Buen día, Guille: todo normal". Sin base de datos ni red, para probarlo.
 */
public final class SummaryBuilder {

    static final int MAX_ITEMS = 3;
    /** De mas grave a menos grave. */
    private static final List<AlertType> SEVERITY = List.of(AlertType.INTERRUPCION, AlertType.DEMORA, AlertType.DESVIO, AlertType.OBRA);

    private SummaryBuilder() {
    }

    /** Una alerta activa, lo justo para el resumen. */
    public record ActiveAlert(long lineId, AlertType type, String description) {
    }

    /** Una estacion con su linea. */
    public record StationRef(long lineId, StationInfo station) {
    }

    /** Vacio si la suscripcion no tiene favoritos que resumir. */
    public static Optional<PushMessage> build(Subscriber sub, String name, int hour, Map<Long, LineInfo> lines,
                                              List<ActiveAlert> alerts, Map<Long, StationRef> stations,
                                              AccessesResponse accesses, String siteUrl) {
        List<String> problems = new ArrayList<>();
        int lineCount = 0;
        int stationCount = 0;
        int accessCount = 0;

        for (Long stationId : sub.stations()) {
            StationRef ref = stations.get(stationId);
            if (ref == null || !lines.containsKey(ref.lineId())) {
                continue;
            }
            stationCount++;
            alerts.stream()
                    .filter(a -> a.lineId() == ref.lineId() && StationMatcher.mentions(a.description(), ref.station().name()))
                    .findFirst()
                    .ifPresent(a -> problems.add(StationMatcher.saysClosed(a.description())
                            ? ref.station().name() + " cerrada"
                            : "Aviso en " + ref.station().name()));
        }
        for (Long lineId : sub.lines()) {
            LineInfo line = lines.get(lineId);
            if (line == null) {
                continue;
            }
            lineCount++;
            alerts.stream()
                    .filter(a -> a.lineId() == lineId)
                    .map(ActiveAlert::type)
                    .min(Comparator.comparingInt(SEVERITY::indexOf))
                    .ifPresent(type -> problems.add(NotificationTexts.lineTitle(line, type)));
        }
        if (accesses != null && accesses.configured()) {
            for (AccessReport access : accesses.accesses()) {
                if (!sub.accesses().contains(access.id())) {
                    continue;
                }
                accessCount++;
                worstDirection(access).ifPresent(p -> problems.add(
                        NotificationTexts.accessTitle(access.name(), p.segment().name(), p.direction().towards(), p.direction().status())));
            }
        } else {
            accessCount = sub.accesses().size();
        }

        if (lineCount + stationCount + accessCount == 0) {
            return Optional.empty();
        }
        String hello = greeting(hour) + (name == null || name.isBlank() ? "" : ", " + name.strip());
        String title;
        String body;
        if (problems.isEmpty()) {
            title = hello + ": todo normal";
            body = favoritesPhrase(lineCount, stationCount, accessCount) + " sin problemas.";
        } else {
            title = hello + ": " + (problems.size() == 1 ? "1 problema" : problems.size() + " problemas") + " en tus favoritos";
            List<String> shown = problems.subList(0, Math.min(MAX_ITEMS, problems.size()));
            body = String.join(" · ", shown)
                    + (problems.size() > MAX_ITEMS ? " y " + (problems.size() - MAX_ITEMS) + " más." : ".");
            int total = lineCount + stationCount + accessCount;
            if (problems.size() < total) {
                body += " El resto, normal.";
            }
        }
        return Optional.of(new PushMessage(title, NotificationTexts.shorten(body), siteUrl + "/icon-192.png", siteUrl + "/",
                "resumen", "Ver el inicio", problems.isEmpty()));
    }

    static String greeting(int hour) {
        return hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
    }

    /** "Tus 2 líneas, 1 estación y 1 acceso funcionan" (o "Tu línea funciona"). */
    static String favoritesPhrase(int lines, int stations, int accesses) {
        List<String> parts = new ArrayList<>();
        if (lines > 0) {
            parts.add(lines == 1 ? "1 línea" : lines + " líneas");
        }
        if (stations > 0) {
            parts.add(stations == 1 ? "1 estación" : stations + " estaciones");
        }
        if (accesses > 0) {
            parts.add(accesses == 1 ? "1 acceso" : accesses + " accesos");
        }
        int total = lines + stations + accesses;
        String joined = parts.size() == 1 ? parts.get(0)
                : String.join(", ", parts.subList(0, parts.size() - 1)) + " y " + parts.get(parts.size() - 1);
        if (total == 1) {
            return "Tu " + joined.substring(2) + " funciona";
        }
        return "Tus " + joined + " funcionan";
    }

    private record Problem(SegmentReport segment, DirectionReport direction) {
    }

    /** La mano mas complicada del acceso, si esta congestionada o cortada. */
    private static Optional<Problem> worstDirection(AccessReport access) {
        Problem worst = null;
        for (SegmentReport s : access.segments()) {
            for (DirectionReport d : s.directions()) {
                if (d.status() != TrafficStatus.CONGESTIONADO && d.status() != TrafficStatus.CORTADO) {
                    continue;
                }
                if (worst == null || (d.status() == TrafficStatus.CORTADO && worst.direction().status() != TrafficStatus.CORTADO)) {
                    worst = new Problem(s, d);
                }
            }
        }
        return Optional.ofNullable(worst);
    }
}
