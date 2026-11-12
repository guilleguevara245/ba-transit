package com.batransit.api.trenes;

import com.batransit.api.domain.Alert;
import com.batransit.api.domain.Branch;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.MapStation;
import com.batransit.api.estado.SourceHealth;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.BranchRepository;
import com.batransit.api.repository.StationRepository;
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

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Alertas del momento de las lineas de Trenes Argentinos (las de su app),
 * leidas cada 5 minutos de la API de Trenes y guardadas como alertas de
 * cada linea: aparecen en el estado de la red, en la linea y, si nombran
 * una estacion, en esa estacion. Cada alerta viene de un ramal: se guarda
 * cual de los nuestros es (por la estacion donde termina), asi una demora
 * del ramal a González Catán no aparece en las estaciones del otro.
 *
 * Si una linea no responde, sus alertas guardadas quedan como estaban (una
 * fuente caida no borra nada); las que ya no figuran se dan de baja.
 *
 * Ademas, una vez por hora pide los arribos de la estacion donde empieza
 * cada ramal de las seis lineas: asi el log anota los tipos de servicio que
 * existen (Normal, Rapido...) aunque nadie este mirando esas estaciones.
 */
@Service
public class SofseAlertsSyncService {

    private static final Logger log = LoggerFactory.getLogger(SofseAlertsSyncService.class);

    static final String SOURCE_NAME = "API Trenes Argentinos";
    /** Cada cuanto se relevan las cabeceras de los ramales (para anotar los tipos de servicio). */
    static final Duration SURVEY_EVERY = Duration.ofHours(1);

    private final SofseArrivalsClient client;
    private final AlertRepository alertRepository;
    private final TransportLineRepository lineRepository;
    private final StationRepository stationRepository;
    private final BranchRepository branchRepository;
    private final TransactionTemplate transactionTemplate;
    private SourceHealth health = SourceHealth.NOOP;
    private Instant lastSurvey = Instant.EPOCH;

    public SofseAlertsSyncService(SofseArrivalsClient client, AlertRepository alertRepository,
                                  TransportLineRepository lineRepository, StationRepository stationRepository,
                                  BranchRepository branchRepository, PlatformTransactionManager transactionManager) {
        this.client = client;
        this.alertRepository = alertRepository;
        this.lineRepository = lineRepository;
        this.stationRepository = stationRepository;
        this.branchRepository = branchRepository;
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
        List<Integer> starts = new ArrayList<>();
        for (Map.Entry<String, Integer> line : SofseArrivals.GERENCIAS.entrySet()) {
            JsonNode branches = client.branches(line.getValue());
            if (branches != null) {
                byLine.put(line.getKey(), SofseAlerts.parse(branches, now));
                starts.addAll(SofseArrivals.branchStarts(branches));
            }
        }
        if (byLine.isEmpty()) {
            health.fail(SourceHealth.Source.TRENES_SOFSE_ALERTAS, "sin respuesta");
            log.warn("Alertas de Trenes Argentinos: ninguna linea respondio; no se toca nada.");
            return;
        }
        Map<String, Long> branches = branchesOf(byLine);
        try {
            transactionTemplate.executeWithoutResult(status -> apply(byLine, branches));
            health.ok(SourceHealth.Source.TRENES_SOFSE_ALERTAS);
        } catch (Exception e) {
            health.fail(SourceHealth.Source.TRENES_SOFSE_ALERTAS, "error al guardar");
            log.error("Alertas de Trenes Argentinos: error al guardar ({})", e.getClass().getSimpleName());
        }
        // Despues de guardar las alertas, para no demorarlas.
        survey(starts, now);
    }

    /** Una vez por hora, los arribos de cada cabecera (los tipos de servicio quedan en el log). */
    private void survey(List<Integer> stations, Instant now) {
        if (stations.isEmpty() || lastSurvey.plus(SURVEY_EVERY).isAfter(now)) {
            return;
        }
        lastSurvey = now;
        stations.stream().distinct().forEach(client::arrivals);
    }

    /**
     * Para cada alerta de un solo ramal, cual de nuestros ramales es: el
     * que tiene una estacion donde termina el de SOFSE (si es uno solo; el
     * resto queda para toda la linea). Fuera de la transaccion: puede pedir
     * las estaciones de la linea a la API.
     */
    private Map<String, Long> branchesOf(Map<String, List<SofseAlert>> byLine) {
        Map<String, Long> branches = new LinkedHashMap<>();
        List<MapStation> ours = null;
        for (Map.Entry<String, List<SofseAlert>> entry : byLine.entrySet()) {
            int gerencia = SofseArrivals.GERENCIAS.get(entry.getKey());
            for (SofseAlert alert : entry.getValue()) {
                if (alert.branchEnd() == null) {
                    continue;
                }
                if (ours == null) {
                    ours = stationRepository.findMapStationsByMode(TransportMode.TREN);
                }
                Long branch = branchAt(entry.getKey(), gerencia, alert.branchEnd(), ours);
                if (branch != null) {
                    branches.put(SofseAlerts.externalId(entry.getKey(), alert.id()), branch);
                }
            }
        }
        return branches;
    }

    /** Nuestro ramal de la linea con una estacion donde esta la de SOFSE, si es uno solo. */
    private Long branchAt(String line, int gerencia, int sofseStation, List<MapStation> ours) {
        SofseArrivals.Station end = client.station(gerencia, sofseStation).orElse(null);
        if (end == null) {
            return null;
        }
        Set<Long> branches = ours.stream()
                .filter(o -> line.equals(o.lineCode()) && o.latitude() != null && o.longitude() != null
                        && o.branchId() != null)
                .filter(o -> SofseArrivals.meters(end.latitude(), end.longitude(), o.latitude().doubleValue(),
                        o.longitude().doubleValue()) <= SofseArrivals.MAX_METERS)
                .map(MapStation::branchId)
                .collect(Collectors.toSet());
        return branches.size() == 1 ? branches.iterator().next() : null;
    }

    private void apply(Map<String, List<SofseAlert>> byLine, Map<String, Long> branches) {
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
                Long branchId = branches.get(externalId);
                Branch branch = branchId == null ? null : branchRepository.findById(branchId).orElse(null);
                Alert existing = alertRepository.findByExternalId(externalId).orElse(null);
                if (existing == null) {
                    Alert fresh = new Alert(line, alert.type(), alert.description(), SOURCE_NAME, externalId,
                            alert.cause(), alert.effect());
                    fresh.setBranch(branch);
                    alertRepository.save(fresh);
                    created++;
                } else {
                    existing.updateFromSource(alert.type(), alert.description(), alert.cause(), alert.effect());
                    existing.setBranch(branch);
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
