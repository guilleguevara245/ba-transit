package com.batransit.api.scheduler;

import com.batransit.api.service.SubteAlertSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SubteAlertSyncJob {

    private static final Logger log = LoggerFactory.getLogger(SubteAlertSyncJob.class);

    private final SubteAlertSyncService syncService;

    public SubteAlertSyncJob(SubteAlertSyncService syncService) {
        this.syncService = syncService;
    }

    /**
     * fixedRate: 5 minutos entre el INICIO de una corrida y el inicio
     * de la siguiente. initialDelay: espera 10 segundos tras el
     * arranque de la app antes de la primera corrida, para no competir
     * con el resto de la inicializacion.
     */
    @Scheduled(fixedRate = 300_000, initialDelay = 10_000)
    public void run() {
        log.info("Arrancando sincronizacion programada de alertas de subte...");
        try {
            syncService.sync();
        } catch (Exception e) {
            // Ultima red de seguridad: pase lo que pase aca, el scheduler
            // de Spring sigue vivo para la proxima corrida.
            log.error("Error inesperado en la sincronizacion programada de alertas de subte", e);
        }
    }
}
