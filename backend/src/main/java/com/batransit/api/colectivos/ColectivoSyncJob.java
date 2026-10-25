package com.batransit.api.colectivos;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Carga el feed de colectivos un minuto despues del arranque y despues
 * una vez por dia (los recorridos cambian poco).
 */
@Component
public class ColectivoSyncJob {

    private final ColectivoService service;

    public ColectivoSyncJob(ColectivoService service) {
        this.service = service;
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 24 * 60 * 60 * 1000L)
    public void run() {
        service.refresh();
    }
}
