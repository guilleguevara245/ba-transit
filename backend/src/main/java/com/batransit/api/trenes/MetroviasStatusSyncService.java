package com.batransit.api.trenes;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.domain.Alert;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import com.batransit.api.trenes.MetroviasStatusParser.LineStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Estado del Urquiza segun Metrovias, cada 5 minutos. Si el servicio no
 * es normal se guarda como alerta de la linea (fuente "Metrovías"); si
 * vuelve a la normalidad, se da de baja. Si Metrovias no responde o el
 * mensaje no se entiende, no se toca nada.
 */
@Service
public class MetroviasStatusSyncService {

    private static final Logger log = LoggerFactory.getLogger(MetroviasStatusSyncService.class);

    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }
    static final String SOURCE_NAME = "Metrovías";
    static final String ID_PREFIX = "metrovias:";

    private final MetroviasStatusClient client;
    private final AlertRepository alertRepository;
    private final TransportLineRepository lineRepository;
    private final TransactionTemplate transactionTemplate;

    public MetroviasStatusSyncService(MetroviasStatusClient client, AlertRepository alertRepository,
                                      TransportLineRepository lineRepository,
                                      PlatformTransactionManager transactionManager) {
        this.client = client;
        this.alertRepository = alertRepository;
        this.lineRepository = lineRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 5 * 60 * 1000L)
    public void sync() {
        Optional<String> html = client.fetchStatusHtml();
        if (html.isEmpty()) {
            health.fail(SourceHealth.Source.METROVIAS, "sin respuesta");
            return;
        }
        Optional<LineStatus> status = MetroviasStatusParser.parse(html.get());
        if (status.isEmpty()) {
            health.fail(SourceHealth.Source.METROVIAS, "formato inesperado");
            log.warn("Estado de Metrovias: el mensaje no tiene el formato esperado; no se toca nada.");
            return;
        }
        try {
            transactionTemplate.executeWithoutResult(s -> apply(status.get()));
            health.ok(SourceHealth.Source.METROVIAS);
        } catch (Exception e) {
            health.fail(SourceHealth.Source.METROVIAS, "error al guardar");
            log.error("Estado de Metrovias: error al guardar ({})", e.getClass().getSimpleName());
        }
    }

    void apply(LineStatus status) {
        TransportLine line = lineRepository.findByModeAndCodeIgnoreCase(TransportMode.TREN, status.lineCode())
                .orElse(null);
        if (line == null) {
            return;
        }
        String currentId = status.normal() ? null : externalId(status);
        // Los avisos anteriores de esta fuente que no son el estado actual se dan de baja.
        List<Alert> gone = alertRepository.findByActiveTrueAndExternalIdIsNotNull().stream()
                .filter(a -> SOURCE_NAME.equals(a.getSource()))
                .filter(a -> !a.getExternalId().equals(currentId))
                .toList();
        gone.forEach(a -> a.setActive(false));
        if (currentId != null) {
            Optional<Alert> existing = alertRepository.findByExternalId(currentId);
            if (existing.isPresent()) {
                existing.get().setActive(true);
            } else {
                alertRepository.save(new Alert(line, status.type(), status.description(), SOURCE_NAME, currentId,
                        null, null));
            }
        }
        log.info("Estado de Metrovias: {} {} ({} avisos dados de baja).", status.lineCode(), status.status(),
                gone.size());
    }

    /** Id estable por linea y estado: si cambia el texto, es otro aviso. */
    static String externalId(LineStatus status) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest((status.lineCode() + "|" + status.status()).getBytes(StandardCharsets.UTF_8));
            return ID_PREFIX + status.lineCode() + ":" + HexFormat.of().formatHex(hash, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
