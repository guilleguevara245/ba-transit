package com.batransit.api.notificaciones;

import com.batransit.api.accesos.AccessModels.AccessReport;
import com.batransit.api.accesos.AccessModels.AccessesResponse;
import com.batransit.api.accesos.AccessModels.DirectionReport;
import com.batransit.api.accesos.AccessModels.SegmentReport;
import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.batransit.api.notificaciones.NotificationPlanner.AccessChange;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Sigue el estado de cada mano de cada tramo entre mediciones (cada 20
 * minutos) y avisa los cambios que importan:
 * - Problema: congestionado o cortado en dos mediciones seguidas (un
 *   embotellamiento de cinco minutos no avisa).
 * - Fin: el tramo vuelve a fluido despues de un problema avisado.
 * Sin datos no cambia nada. Guarda el estado en memoria (se reinicia con
 * el servidor: lo peor que pasa es tardar una medicion mas en avisar).
 */
public class AccessWatcher {

    private static final Set<TrafficStatus> BAD = Set.of(TrafficStatus.CONGESTIONADO, TrafficStatus.CORTADO);

    private record State(TrafficStatus last, String openEpisode) {
    }

    private final Map<String, State> states = new HashMap<>();
    private Instant lastReport;

    /** Los cambios de esta medicion; vacio si es la misma que la anterior. */
    public synchronized List<AccessChange> update(AccessesResponse report) {
        List<AccessChange> changes = new ArrayList<>();
        if (report == null || !report.configured() || report.updatedAt() == null || report.updatedAt().equals(lastReport)) {
            return changes;
        }
        lastReport = report.updatedAt();
        for (AccessReport access : report.accesses()) {
            for (SegmentReport segment : access.segments()) {
                for (DirectionReport d : segment.directions()) {
                    String key = access.id() + "|" + segment.name() + "|" + d.towards();
                    State before = states.getOrDefault(key, new State(null, null));
                    if (d.status() == TrafficStatus.SIN_DATOS || d.status() == null) {
                        continue;
                    }
                    String episode = before.openEpisode();
                    if (BAD.contains(d.status()) && before.last() != null && BAD.contains(before.last()) && episode == null) {
                        episode = "acceso:" + access.id() + ":" + NotificationTexts.textSlug(segment.name()) + ":"
                                + NotificationTexts.textSlug(d.towards()) + ":" + report.updatedAt().getEpochSecond();
                        changes.add(change(access, segment, d, false, episode));
                    } else if (episode != null && d.status() == TrafficStatus.FLUIDO) {
                        changes.add(change(access, segment, d, true, episode));
                        episode = null;
                    }
                    states.put(key, new State(d.status(), episode));
                }
            }
        }
        return changes;
    }

    private static AccessChange change(AccessReport a, SegmentReport s, DirectionReport d, boolean resolved, String episode) {
        return new AccessChange(a.id(), a.name(), a.road(), s.name(), d.towards(), d.status(), d.currentSpeed(),
                d.freeFlowSpeed(), resolved, episode);
    }
}
