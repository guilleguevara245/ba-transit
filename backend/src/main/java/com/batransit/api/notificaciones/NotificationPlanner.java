package com.batransit.api.notificaciones;

import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.batransit.api.domain.AlertType;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiPredicate;

/**
 * Decide que aviso le corresponde a cada suscripcion. Sin base de datos ni
 * red: recibe los datos y devuelve los avisos a mandar, asi se puede probar.
 *
 * - Alerta de una linea: si la alerta nombra una estacion favorita de esa
 *   linea, va el aviso de estacion (el mas preciso); si no, el de linea a
 *   quien la tenga en "Mis lineas". Uno solo por alerta y suscripcion.
 * - Fin de una alerta: solo a quien recibio el aviso de inicio y quiere
 *   los avisos de "volvio a la normalidad".
 * - Accesos: los arma AccessWatcher y se reparten aca.
 */
public final class NotificationPlanner {

    private NotificationPlanner() {
    }

    /** Preferencias de una suscripcion. quietFrom/quietTo: horas sin avisos (null = siempre). */
    public record Subscriber(long id, Set<Long> lines, Set<Long> stations, Set<String> accesses, boolean wantLines,
                             boolean wantStations, boolean wantAccesses, boolean notifyResolved) {
    }

    public record StationInfo(long id, String name, long branchId, int order) {
    }

    /** Una alerta que empieza (ended=false) o termina (ended=true). */
    public record AlertEvent(long alertId, LineInfo line, AlertType type, String description, boolean ended) {
    }

    public record Planned(long subscriptionId, String eventKey, PushMessage message) {
    }

    /**
     * alreadySent(suscripcion, clave): si ya se le mando ese aviso (para el
     * fin de una alerta, si recibio el de inicio).
     */
    public static List<Planned> forAlert(AlertEvent event, List<StationInfo> lineStations, List<Subscriber> subscribers,
                                         String siteUrl, BiPredicate<Long, String> alreadySent) {
        List<Planned> out = new ArrayList<>();
        String startKey = "alerta:" + event.alertId();
        for (Subscriber sub : subscribers) {
            if (event.ended() && (!sub.notifyResolved() || !alreadySent.test(sub.id(), startKey))) {
                continue;
            }
            String key = event.ended() ? "alerta-fin:" + event.alertId() : startKey;
            Optional<StationInfo> station = sub.wantStations()
                    ? lineStations.stream()
                            .filter(s -> sub.stations().contains(s.id()))
                            .filter(s -> StationMatcher.mentions(event.description(), s.name()))
                            .findFirst()
                    : Optional.empty();
            if (station.isPresent()) {
                out.add(new Planned(sub.id(), key, stationMessage(event, station.get(), lineStations, siteUrl)));
            } else if (sub.wantLines() && sub.lines().contains(event.line().id())) {
                out.add(new Planned(sub.id(), key, lineMessage(event, siteUrl)));
            }
        }
        return out;
    }

    static PushMessage lineMessage(AlertEvent e, String siteUrl) {
        LineInfo line = e.line();
        String url = siteUrl + "/lineas/" + line.slug();
        String icon = siteUrl + "/notif/linea-" + line.slug() + ".png";
        String tag = "linea-" + line.id();
        if (e.ended()) {
            return new PushMessage(NotificationTexts.lineResolvedTitle(line), NotificationTexts.lineResolvedBody(e.type()),
                    icon, url, tag, "Ver la línea", true);
        }
        return new PushMessage(NotificationTexts.lineTitle(line, e.type()),
                NotificationTexts.shorten(NotificationTexts.clean(e.description())), icon, url, tag, "Ver la línea", false);
    }

    static PushMessage stationMessage(AlertEvent e, StationInfo station, List<StationInfo> lineStations, String siteUrl) {
        LineInfo line = e.line();
        boolean closed = StationMatcher.saysClosed(e.description());
        String url = siteUrl + "/estaciones/" + line.slug() + "/" + NotificationTexts.textSlug(station.name());
        String icon = siteUrl + "/notif/estacion-" + line.slug() + ".png";
        String tag = "estacion-" + station.id();
        if (e.ended()) {
            return new PushMessage(NotificationTexts.stationResolvedTitle(station.name(), closed),
                    NotificationTexts.stationResolvedBody(line, closed), icon, url, tag, "Ver la estación", true);
        }
        List<String> neighbors = closed ? neighbors(station, lineStations) : List.of();
        return new PushMessage(NotificationTexts.stationTitle(station.name(), closed),
                NotificationTexts.stationBody(line, e.description(), neighbors), icon, url, tag, "Ver la estación", false);
    }

    /** Las estaciones de al lado en el mismo ramal (sin repetir nombres). */
    static List<String> neighbors(StationInfo station, List<StationInfo> lineStations) {
        Set<String> names = new LinkedHashSet<>();
        for (int delta : new int[] {-1, 1}) {
            lineStations.stream()
                    .filter(s -> s.branchId() == station.branchId() && s.order() == station.order() + delta)
                    .map(StationInfo::name)
                    .filter(n -> !n.equals(station.name()))
                    .findFirst()
                    .ifPresent(names::add);
        }
        return List.copyOf(names);
    }

    /** Un cambio de estado de una mano de un acceso (ver AccessWatcher). */
    public record AccessChange(String accessId, String accessName, String road, String segment, String towards,
                               TrafficStatus status, Integer currentSpeed, Integer freeFlowSpeed, boolean resolved,
                               String episodeKey) {
    }

    /**
     * Accesos: a quien lo tenga en "Mis accesos". Como mucho un aviso por
     * acceso por hora (clave con la hora), y el de "fluido" solo a quien
     * recibio el del problema.
     */
    public static List<Planned> forAccess(AccessChange change, List<Subscriber> subscribers, String siteUrl, String hourBucket,
                                          BiPredicate<Long, String> alreadySent) {
        List<Planned> out = new ArrayList<>();
        String icon = siteUrl + "/notif/acceso-" + change.accessId() + ".png";
        String url = siteUrl + "/accesos";
        String tag = "acceso-" + change.accessId();
        for (Subscriber sub : subscribers) {
            if (!sub.wantAccesses() || !sub.accesses().contains(change.accessId())) {
                continue;
            }
            if (change.resolved()) {
                if (!sub.notifyResolved() || !alreadySent.test(sub.id(), change.episodeKey())) {
                    continue;
                }
                out.add(new Planned(sub.id(), change.episodeKey() + ":fin", new PushMessage(
                        NotificationTexts.accessResolvedTitle(change.accessName(), change.segment()),
                        NotificationTexts.accessResolvedBody(change.segment(), change.towards(), change.currentSpeed()),
                        icon, url, tag, "Ver los accesos", true)));
            } else {
                // Si ya hubo un aviso de este acceso en esta hora, este se saltea.
                if (alreadySent.test(sub.id(), "acceso-hora:" + change.accessId() + ":" + hourBucket)) {
                    continue;
                }
                out.add(new Planned(sub.id(), change.episodeKey(), new PushMessage(
                        NotificationTexts.accessTitle(change.accessName(), change.segment(), change.towards(), change.status()),
                        NotificationTexts.accessBody(change.segment(), change.status(), change.currentSpeed(), change.freeFlowSpeed()),
                        icon, url, tag, "Ver los accesos", false)));
            }
        }
        return out;
    }
}
