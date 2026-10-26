package com.batransit.api.live;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * Tiene cargado el horario programado del subte. Arranca con la copia del
 * GTFS que viene con la aplicacion (resources/gtfs/subte.zip) y una vez
 * por semana intenta bajar la version vigente de la API Transporte; si
 * falla, sigue con la que tiene.
 */
@Service
public class SubteScheduleService {

    private static final Logger log = LoggerFactory.getLogger(SubteScheduleService.class);
    static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");

    private final TransporteLiveClient client;
    private volatile SubteSchedule schedule;

    public SubteScheduleService(TransporteLiveClient client) {
        this.client = client;
        this.schedule = loadBundled();
    }

    private static SubteSchedule loadBundled() {
        try (InputStream in = new ClassPathResource("gtfs/subte.zip").getInputStream()) {
            return SubteSchedule.parse(in.readAllBytes());
        } catch (IOException | RuntimeException e) {
            log.warn("Horario del subte: no se pudo leer la copia incluida ({}).", e.getClass().getSimpleName());
            return null;
        }
    }

    @Scheduled(initialDelay = 2 * 60 * 1000L, fixedDelay = 7 * 24 * 60 * 60 * 1000L)
    public void refresh() {
        Optional<byte[]> zip = client.getBytes("/subtes/feed-gtfs");
        if (zip.isEmpty()) {
            return;
        }
        try {
            SubteSchedule fresh = SubteSchedule.parse(zip.get());
            if (fresh.tripCount() == 0) {
                log.warn("Horario del subte: el GTFS descargado no tiene viajes; se mantiene el anterior.");
                return;
            }
            schedule = fresh;
            log.info("Horario del subte: GTFS actualizado ({} viajes modelo).", fresh.tripCount());
        } catch (IOException | RuntimeException e) {
            log.warn("Horario del subte: el GTFS descargado no se pudo leer ({}); se mantiene el anterior.",
                    e.getClass().getSimpleName());
        }
    }

    public boolean isAvailable() {
        return schedule != null;
    }

    public List<SubteSchedule.Direction> nextArrivals(String lineCode, String stationName) {
        SubteSchedule current = schedule;
        if (current == null) {
            return List.of();
        }
        return current.nextArrivals(lineCode, stationName, LocalDateTime.now(BUENOS_AIRES));
    }
}
