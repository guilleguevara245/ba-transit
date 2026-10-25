package com.batransit.api.colectivos;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;

/**
 * Al arrancar carga la copia de los colectivos guardada en la base (tarda
 * segundos). El feed GTFS se descarga solo si no hay copia o si tiene mas
 * de un dia: se revisa un minuto despues del arranque y despues cada hora.
 */
@Component
public class ColectivoSyncJob {

    static final Duration MAX_AGE = Duration.ofHours(24);

    private final ColectivoService service;
    private final Clock clock = Clock.systemUTC();

    public ColectivoSyncJob(ColectivoService service) {
        this.service = service;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void restore() {
        service.restoreSnapshot();
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 60 * 60 * 1000L)
    public void run() {
        if (service.needsRefresh(MAX_AGE, clock.instant())) {
            service.refresh();
        }
    }
}
