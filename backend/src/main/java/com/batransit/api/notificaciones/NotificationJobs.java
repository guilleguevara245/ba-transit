package com.batransit.api.notificaciones;

import com.batransit.api.accesos.AccessService;
import com.batransit.api.domain.Alert;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.dto.MapStation;
import com.batransit.api.notificaciones.NotificationPlanner.AccessChange;
import com.batransit.api.notificaciones.NotificationPlanner.AlertEvent;
import com.batransit.api.notificaciones.NotificationPlanner.Planned;
import com.batransit.api.notificaciones.NotificationPlanner.StationInfo;
import com.batransit.api.notificaciones.NotificationPlanner.Subscriber;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.StationRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Revisa cada pocos minutos si hay algo para avisar:
 * - Alertas: compara las alertas activas con las de la vuelta anterior;
 *   las nuevas avisan el inicio y las que ya no estan, el fin. En la
 *   primera vuelta despues de arrancar solo toma nota (no avisa lo viejo).
 * - Accesos: si alguien sigue algun acceso, mira cada medicion de TomTom
 *   (AccessWatcher decide que cambio importa).
 */
@Component
public class NotificationJobs {

    private static final Logger log = LoggerFactory.getLogger(NotificationJobs.class);
    /** Una alerta creada hace mas que esto no se avisa como nueva (por ejemplo, tras un reinicio largo). */
    static final Duration MAX_ALERT_AGE = Duration.ofHours(1);
    private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("yyyyMMddHH");

    /** Lo que hace falta recordar de una alerta activa para avisar su fin. */
    record Snapshot(long id, long lineId, AlertType type, String description) {
    }

    private final AlertRepository alerts;
    private final TransportLineRepository lines;
    private final StationRepository stations;
    private final AccessService accesses;
    private final NotificationService notifications;
    private final TransactionTemplate tx;
    private final AccessWatcher accessWatcher = new AccessWatcher();

    private Map<Long, Snapshot> previous;
    private Map<Long, List<StationInfo>> stationsByLine = Map.of();
    private Instant stationsLoadedAt = Instant.EPOCH;

    public NotificationJobs(AlertRepository alerts, TransportLineRepository lines, StationRepository stations,
                            AccessService accesses, NotificationService notifications, PlatformTransactionManager tm) {
        this.alerts = alerts;
        this.lines = lines;
        this.stations = stations;
        this.accesses = accesses;
        this.notifications = notifications;
        this.tx = new TransactionTemplate(tm);
    }

    @Scheduled(initialDelay = 90_000L, fixedDelay = 2 * 60_000L)
    public void checkAlerts() {
        try {
            runAlerts(Instant.now());
        } catch (RuntimeException e) {
            log.warn("Avisos de alertas: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    synchronized void runAlerts(Instant now) {
        record Loaded(Map<Long, Snapshot> active, Map<Long, Instant> createdAt, Map<Long, LineInfo> lineInfo) {
        }
        Loaded loaded = tx.execute(status -> {
            Map<Long, Snapshot> active = new HashMap<>();
            Map<Long, Instant> created = new HashMap<>();
            for (Alert a : alerts.findByActiveTrueOrderByPublishedAtDesc()) {
                active.put(a.getId(), new Snapshot(a.getId(), a.transportLineId(), a.getType(),
                        a.getDescription() == null ? "" : a.getDescription()));
                created.put(a.getId(), a.getCreatedAt());
            }
            Map<Long, LineInfo> info = new HashMap<>();
            for (TransportLine l : lines.findAll()) {
                info.put(l.getId(), new LineInfo(l.getId(), l.getMode(), l.getCode(), l.getName()));
            }
            return new Loaded(active, created, info);
        });
        if (loaded == null) {
            return;
        }
        if (previous == null) {
            previous = loaded.active();
            return; // primera vuelta: solo se toma nota
        }
        List<AlertEvent> events = new ArrayList<>();
        for (Snapshot s : loaded.active().values()) {
            Instant created = loaded.createdAt().get(s.id());
            boolean recent = created == null || created.isAfter(now.minus(MAX_ALERT_AGE));
            if (!previous.containsKey(s.id()) && recent && loaded.lineInfo().containsKey(s.lineId())) {
                events.add(new AlertEvent(s.id(), loaded.lineInfo().get(s.lineId()), s.type(), s.description(), false));
            }
        }
        for (Snapshot s : previous.values()) {
            if (!loaded.active().containsKey(s.id()) && loaded.lineInfo().containsKey(s.lineId())) {
                events.add(new AlertEvent(s.id(), loaded.lineInfo().get(s.lineId()), s.type(), s.description(), true));
            }
        }
        previous = loaded.active();
        if (events.isEmpty()) {
            return;
        }
        List<Subscriber> subs = notifications.subscribers();
        if (subs.isEmpty()) {
            return;
        }
        Map<Long, List<StationInfo>> byLine = stationsByLine(now);
        List<Planned> planned = new ArrayList<>();
        for (AlertEvent e : events) {
            planned.addAll(NotificationPlanner.forAlert(e, byLine.getOrDefault(e.line().id(), List.of()), subs,
                    notifications.siteUrl(), notifications::wasSent));
        }
        notifications.deliver(planned, null);
    }

    /** Las estaciones de cada linea (se recargan cada 6 horas: casi no cambian). */
    private Map<Long, List<StationInfo>> stationsByLine(Instant now) {
        if (now.isAfter(stationsLoadedAt.plus(Duration.ofHours(6)))) {
            List<MapStation> all = tx.execute(status -> stations.findAllMapStations());
            if (all != null) {
                stationsByLine = all.stream().collect(Collectors.groupingBy(MapStation::lineId,
                        Collectors.mapping(s -> new StationInfo(s.stationId(), s.stationName(), s.branchId(),
                                s.sequenceOrder() == null ? 0 : s.sequenceOrder()), Collectors.toList())));
                stationsLoadedAt = now;
            }
        }
        return stationsByLine;
    }

    /** Cada 5 minutos; solo pide la medicion si alguien sigue algun acceso (cuida el cupo de TomTom). */
    @Scheduled(initialDelay = 180_000L, fixedDelay = 5 * 60_000L)
    public void checkAccesses() {
        try {
            List<Subscriber> subs = notifications.subscribers().stream()
                    .filter(s -> s.wantAccesses() && !s.accesses().isEmpty())
                    .toList();
            if (subs.isEmpty()) {
                return;
            }
            List<AccessChange> changes = accessWatcher.update(accesses.report());
            if (changes.isEmpty()) {
                return;
            }
            String bucket = ZonedDateTime.now(NotificationService.BUENOS_AIRES).format(HOUR);
            List<Planned> planned = new ArrayList<>();
            for (AccessChange c : changes) {
                planned.addAll(NotificationPlanner.forAccess(c, subs, notifications.siteUrl(), bucket, notifications::wasSent));
            }
            Map<String, String> hourKeys = changes.stream().filter(c -> !c.resolved())
                    .collect(Collectors.toMap(AccessChange::episodeKey, c -> "acceso-hora:" + c.accessId() + ":" + bucket, (a, b) -> a));
            notifications.deliver(planned, p -> hourKeys.get(p.eventKey()));
        } catch (RuntimeException e) {
            log.warn("Avisos de accesos: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    /** Una vez por dia se borra el registro de avisos de hace mas de 30 dias. */
    @Scheduled(initialDelay = 600_000L, fixedDelay = 24 * 3600_000L)
    public void cleanup() {
        try {
            notifications.cleanup(Instant.now().minus(Duration.ofDays(30)));
        } catch (RuntimeException e) {
            log.warn("Avisos: fallo la limpieza ({})", e.getClass().getSimpleName());
        }
    }
}
