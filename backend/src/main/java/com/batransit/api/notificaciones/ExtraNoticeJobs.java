package com.batransit.api.notificaciones;

import com.batransit.api.clima.WeatherAlertService;
import com.batransit.api.colectivos.BusAlertController;
import com.batransit.api.colectivos.BusAlertParser;
import com.batransit.api.live.TransporteLiveClient;
import com.batransit.api.domain.Fare;
import com.batransit.api.domain.SpecialService;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.dto.MapStation;
import com.batransit.api.notificaciones.ExtraNotices.FareRow;
import com.batransit.api.notificaciones.ExtraNotices.SpecialItem;
import com.batransit.api.notificaciones.ExtraNotices.Target;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;
import com.batransit.api.repository.FareRepository;
import com.batransit.api.repository.SpecialServiceRepository;
import com.batransit.api.repository.StationRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Los avisos que no salen de las alertas de las lineas (ver ExtraNotices):
 * - Clima: cada 5 minutos mira las alertas del SMN para el AMBA.
 * - Tarifas: cada 30 minutos compara el boleto de referencia de cada modo
 *   con el de la vuelta anterior (guardado en app_setting, asi un reinicio
 *   no lo confunde con un cambio). La primera vez solo toma nota.
 * - Servicios especiales: cada 30 minutos, de 7 a 21, los que empiezan o se
 *   cargaron hace poco, a quien sigue esa linea.
 * - Ultimo tren: cada 2 minutos.
 * - Colectivos: cada 5 minutos, si alguien sigue un colectivo, los avisos
 *   de la API Transporte que nombran sus lineas.
 */
@Component
public class ExtraNoticeJobs {

    private static final Logger log = LoggerFactory.getLogger(ExtraNoticeJobs.class);
    static final String FARES_SETTING = "avisos:tarifas";
    /** Un servicio especial se avisa si empieza hoy o ayer, o si se cargo hace menos que esto. */
    static final Duration SPECIAL_RECENT = Duration.ofHours(48);

    private final WeatherAlertService weather;
    private final FareRepository fares;
    private final SpecialServiceRepository specials;
    private final TransportLineRepository lines;
    private final StationRepository stations;
    private final NotificationService notifications;
    private final PushStore store;
    private final TransporteLiveClient transporte;
    private final TransactionTemplate tx;

    private Map<Long, Long> stationLine = Map.of();
    private Instant stationsLoadedAt = Instant.EPOCH;

    public ExtraNoticeJobs(WeatherAlertService weather, FareRepository fares, SpecialServiceRepository specials,
                           TransportLineRepository lines, StationRepository stations, NotificationService notifications,
                           PushStore store, TransporteLiveClient transporte, PlatformTransactionManager tm) {
        this.transporte = transporte;
        this.weather = weather;
        this.fares = fares;
        this.specials = specials;
        this.lines = lines;
        this.stations = stations;
        this.notifications = notifications;
        this.store = store;
        this.tx = new TransactionTemplate(tm);
    }

    private ZonedDateTime now() {
        return ZonedDateTime.now(NotificationService.BUENOS_AIRES);
    }

    @Scheduled(initialDelay = 150_000L, fixedDelay = 5 * 60_000L)
    public void checkWeather() {
        try {
            var alerts = weather.current();
            if (alerts.isEmpty()) {
                return;
            }
            List<Target> targets = targets().stream().filter(t -> t.kinds().contains("clima")).toList();
            notifications.deliver(ExtraNotices.weather(alerts, targets, notifications.siteUrl(), now()), null);
        } catch (RuntimeException e) {
            log.warn("Avisos del clima: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    @Scheduled(initialDelay = 240_000L, fixedDelay = 30 * 60_000L)
    public void checkFares() {
        try {
            record Loaded(Map<String, BigDecimal> reference, LocalDate since) {
            }
            Loaded loaded = tx.execute(status -> {
                List<Fare> active = fares.findByActiveTrueOrderByModeAscMinKmAsc();
                List<FareRow> rows = active.stream().map(f -> new FareRow(f.getMode(), f.getJurisdiction(), f.getMinKm(),
                        f.getSection(), f.getTripsFrom(), f.getPrice(), f.getEffectiveFrom())).toList();
                LocalDate since = active.stream().map(Fare::getEffectiveFrom).filter(Objects::nonNull)
                        .max(LocalDate::compareTo).orElse(null);
                return new Loaded(ExtraNotices.referenceFares(rows), since);
            });
            if (loaded == null || loaded.reference().isEmpty()) {
                return;
            }
            String current = ExtraNotices.encode(loaded.reference());
            String saved = store.setting(FARES_SETTING).orElse(null);
            if (current.equals(saved)) {
                return;
            }
            store.saveSetting(FARES_SETTING, current);
            if (saved == null) {
                return; // primera vez: solo se toma nota
            }
            var changes = ExtraNotices.fareChanges(ExtraNotices.decode(saved), loaded.reference());
            String key = "tarifas:" + Integer.toHexString(current.hashCode());
            notifications.deliver(ExtraNotices.fares(changes, loaded.since(), key, targets(), notifications.siteUrl(),
                    now().toLocalDate()), null);
        } catch (RuntimeException e) {
            log.warn("Avisos de tarifas: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    @Scheduled(initialDelay = 300_000L, fixedDelay = 30 * 60_000L)
    public void checkSpecials() {
        try {
            ZonedDateTime now = now();
            if (now.getHour() < 7 || now.getHour() >= 21) {
                return; // de noche no: se avisan a la mañana
            }
            LocalDate today = now.toLocalDate();
            Instant recent = now.toInstant().minus(SPECIAL_RECENT);
            record Loaded(List<SpecialItem> items, Map<Long, LineInfo> lines) {
            }
            Loaded loaded = tx.execute(status -> {
                List<SpecialItem> items = specials.findValidOn(today).stream()
                        .filter(s -> !s.getValidFrom().isBefore(today.minusDays(1))
                                || (s.getCreatedAt() != null && s.getCreatedAt().isAfter(recent)))
                        .map(ExtraNoticeJobs::item)
                        .toList();
                return new Loaded(items, items.isEmpty() ? Map.of() : lineInfo());
            });
            if (loaded == null || loaded.items().isEmpty()) {
                return;
            }
            notifications.deliver(ExtraNotices.specials(loaded.items(), loaded.lines(), targets(), notifications.siteUrl()), null);
        } catch (RuntimeException e) {
            log.warn("Avisos de servicios especiales: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    private static SpecialItem item(SpecialService s) {
        return new SpecialItem(s.getId(), s.getTransportLine().getId(), s.getKind(), s.getTitle(), s.getDays(), s.getSchedule());
    }

    @Scheduled(initialDelay = 200_000L, fixedDelay = 2 * 60_000L)
    public void checkLastTrains() {
        try {
            List<Target> targets = targets().stream().filter(t -> t.lastTrainMinutes() != null && !t.lines().isEmpty()).toList();
            if (targets.isEmpty()) {
                return;
            }
            Map<Long, LineInfo> info = tx.execute(status -> lineInfo());
            if (info == null) {
                return;
            }
            notifications.deliver(ExtraNotices.lastTrains(targets, info, now().toLocalDateTime(), notifications.siteUrl()), null);
        } catch (RuntimeException e) {
            log.warn("Avisos del ultimo tren: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    @Scheduled(initialDelay = 330_000L, fixedDelay = 5 * 60_000L)
    public void checkBusAlerts() {
        try {
            List<Target> targets = targets().stream()
                    .filter(t -> t.kinds().contains("colectivos") && !t.buses().isEmpty()).toList();
            if (targets.isEmpty() || !transporte.isConfigured()) {
                return;
            }
            var fetched = transporte.get(BusAlertController.PATH, BusAlertController.MAX_AGE);
            if (fetched.isEmpty()) {
                return;
            }
            List<ExtraNotices.BusNotice> notices = BusAlertParser.parse(fetched.get().body(), Instant.now()).stream()
                    .filter(a -> !a.lines().isEmpty())
                    .map(a -> new ExtraNotices.BusNotice(a.lines(), a.title(), a.description()))
                    .toList();
            notifications.deliver(ExtraNotices.busNotices(notices, targets, notifications.siteUrl()), null);
        } catch (RuntimeException e) {
            log.warn("Avisos de colectivos: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    private Map<Long, LineInfo> lineInfo() {
        Map<Long, LineInfo> info = new HashMap<>();
        for (TransportLine l : lines.findAll()) {
            info.put(l.getId(), new LineInfo(l.getId(), l.getMode(), l.getCode(), l.getName()));
        }
        return info;
    }

    private List<Target> targets() {
        return notifications.targets(stationLine());
    }

    /** De que linea es cada estacion (se recarga cada 6 horas: casi no cambia). */
    private synchronized Map<Long, Long> stationLine() {
        Instant now = Instant.now();
        if (now.isAfter(stationsLoadedAt.plus(Duration.ofHours(6)))) {
            List<MapStation> all = tx.execute(status -> stations.findAllMapStations());
            if (all != null) {
                Map<Long, Long> map = new HashMap<>();
                all.forEach(s -> map.put(s.stationId(), s.lineId()));
                stationLine = map;
                stationsLoadedAt = now;
            }
        }
        return stationLine;
    }
}
