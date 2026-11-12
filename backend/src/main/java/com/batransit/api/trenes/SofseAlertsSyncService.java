package com.batransit.api.trenes;

import com.batransit.api.domain.Alert;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.estado.SourceHealth;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import com.batransit.api.trenes.SofseAlerts.SofseAlert;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Alertas del momento de las lineas de Trenes Argentinos (las de su app),
 * leidas cada 5 minutos de la API de Trenes y guardadas como alertas de
 * cada linea: aparecen en el estado de la red, en la linea y, si nombran
 * una estacion, en esa estacion.
 *
 * Si una linea no responde, sus alertas guardadas quedan como estaban (una
 * fuente caida no borra nada); las que ya no figuran se dan de baja.
 */
@Service
public class SofseAlertsSyncService {

    private static final Logger log = LoggerFactory.getLogger(SofseAlertsSyncService.class);

    static final String SOURCE_NAME = "API Trenes Argentinos";

    private final SofseArrivalsClient client;
    private final AlertRepository alertRepository;
    private final TransportLineRepository lineRepository;
    private final TransactionTemplate transactionTemplate;
    private SourceHealth health = SourceHealth.NOOP;

    public SofseAlertsSyncService(SofseArrivalsClient client, AlertRepository alertRepository,
                                  TransportLineRepository lineRepository, PlatformTransactionManager transactionManager) {
        this.client = client;
        this.alertRepository = alertRepository;
        this.lineRepository = lineRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 5 * 60 * 1000L)
    public void sync() {
        Instant now = Instant.now();
        Map<String, List<SofseAlert>> byLine = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> line : SofseArrivals.GERENCIAS.entrySet()) {
            JsonNode branches = client.branches(line.getValue());
            if (branches != null) {
                byLine.put(line.getKey(), SofseAlerts.parse(branches, now));
            }
        }
        if (byLine.isEmpty()) {
            health.fail(SourceHealth.Source.TRENES_SOFSE_ALERTAS, "sin respuesta");
            log.warn("Alertas de Trenes Argentinos: ninguna linea respondio; no se toca nada.");
            return;
        }
        try {
            transactionTemplate.executeWithoutResult(status -> apply(byLine));
            health.ok(SourceHealth.Source.TRENES_SOFSE_ALERTAS);
        } catch (Exception e) {
            health.fail(SourceHealth.Source.TRENES_SOFSE_ALERTAS, "error al guardar");
            log.error("Alertas de Trenes Argentinos: error al guardar ({})", e.getClass().getSimpleName());
        }
    }

    private void apply(Map<String, List<SofseAlert>> byLine) {
        Set<String> present = new HashSet<>();
        int created = 0;
        for (Map.Entry<String, List<SofseAlert>> entry : byLine.entrySet()) {
            TransportLine line = lineRepository.findByModeAndCodeIgnoreCase(TransportMode.TREN, entry.getKey())
                    .orElse(null);
            if (line == null) {
                continue;
            }
            for (SofseAlert alert : entry.getValue()) {
                String externalId = SofseAlerts.externalId(entry.getKey(), alert.id());
                present.add(externalId);
                Alert existing = alertRepository.findByExternalId(externalId).orElse(null);
                if (existing == null) {
                    alertRepository.save(new Alert(line, alert.type(), alert.description(), SOURCE_NAME, externalId,
                            alert.cause(), alert.effect()));
                    created++;
                } else {
                    existing.updateFromSource(alert.type(), alert.description(), alert.cause(), alert.effect());
                }
            }
        }
        // Se dan de baja las que ya no figuran, solo de las lineas que respondieron.
        List<Alert> gone = alertRepository.findByActiveTrueAndExternalIdIsNotNull().stream()
                .filter(a -> SOURCE_NAME.equals(a.getSource()))
                .filter(a -> byLine.containsKey(SofseAlerts.lineOf(a.getExternalId())))
                .filter(a -> !present.contains(a.getExternalId()))
                .toList();
        gone.forEach(a -> a.setActive(false));
        log.info("Alertas de Trenes Argentinos: {} vigentes, {} nuevas, {} dadas de baja.",
                present.size(), created, gone.size());
    }
}
