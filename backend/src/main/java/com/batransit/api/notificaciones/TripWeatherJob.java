package com.batransit.api.notificaciones;

import com.batransit.api.clima.ForecastService;
import com.batransit.api.clima.ForecastService.Forecast;
import com.batransit.api.notificaciones.NotificationPlanner.Planned;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * "El clima y tu viaje": cada 2 minutos busca las suscripciones que lo
 * tienen a esta hora (de lunes a viernes, hasta 10 minutos despues de su
 * hora) y, si el clima complica el dia en Casa o Trabajo, les manda un
 * aviso. Uno por dia como mucho.
 */
@Component
public class TripWeatherJob {

    private static final Logger log = LoggerFactory.getLogger(TripWeatherJob.class);
    static final String KEY_PREFIX = "viaje-clima:";
    static final String WEEKDAYS = "12345";

    private final NotificationService notifications;
    private final ForecastService forecasts;

    public TripWeatherJob(NotificationService notifications, ForecastService forecasts) {
        this.notifications = notifications;
        this.forecasts = forecasts;
    }

    @Scheduled(initialDelay = 140_000L, fixedDelay = 2 * 60_000L)
    public void check() {
        try {
            run(ZonedDateTime.now(NotificationService.BUENOS_AIRES));
        } catch (RuntimeException e) {
            log.warn("Clima del viaje: fallo la revision ({})", e.getClass().getSimpleName());
        }
    }

    void run(ZonedDateTime now) {
        List<PushSubscription> due = notifications.withTripWeather().stream()
                .filter(s -> NotificationJobs.isDue(s.getTripWeatherTime(), WEEKDAYS, now))
                .toList();
        if (due.isEmpty()) {
            return;
        }
        String key = KEY_PREFIX + now.format(DateTimeFormatter.BASIC_ISO_DATE);
        // Un pronostico por celda en esta vuelta (el servicio ademas los guarda un rato).
        Map<String, Optional<Forecast>> byCell = new HashMap<>();
        List<Planned> planned = new ArrayList<>();
        for (PushSubscription s : due) {
            if (notifications.wasSent(s.getId(), key)) {
                continue;
            }
            List<TripWeather.Place> places = places(NoticeZones.decode(s.getZones()), byCell);
            TripWeather.plan(places, now.toLocalDateTime(), notifications.siteUrl())
                    .ifPresent(m -> planned.add(new Planned(s.getId(), key, m)));
        }
        notifications.deliver(planned, null);
    }

    /** Casa y Trabajo; si no hay ninguno, la zona del clima. */
    private List<TripWeather.Place> places(List<NoticeZones.Zone> zones, Map<String, Optional<Forecast>> byCell) {
        List<NoticeZones.Zone> chosen = zones.stream().filter(z -> !"zona".equals(z.tipo())).toList();
        if (chosen.isEmpty()) {
            chosen = zones;
        }
        List<TripWeather.Place> out = new ArrayList<>();
        for (NoticeZones.Zone z : chosen) {
            Optional<Forecast> f = byCell.computeIfAbsent(z.cell(), c -> forecasts.forecast(z.lat(), z.lon()));
            f.ifPresent(forecast -> out.add(new TripWeather.Place(label(z.tipo()), forecast)));
        }
        return out;
    }

    static String label(String tipo) {
        return switch (tipo) {
            case "casa" -> "Casa";
            case "trabajo" -> "Trabajo";
            default -> "tu zona";
        };
    }
}
