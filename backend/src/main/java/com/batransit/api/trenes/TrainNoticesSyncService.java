package com.batransit.api.trenes;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.domain.Alert;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import com.batransit.api.trenes.TrainNoticesParser.Result;
import com.batransit.api.trenes.TrainNoticesParser.TrainNotice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

/**
 * Avisos de las lineas de Trenes Argentinos (Roca, Mitre, Sarmiento, San
 * Martin, Belgrano Sur, Tren de la Costa), leidos cada 15 minutos de la
 * pagina publica de modificaciones del servicio y guardados como alertas
 * de cada linea. Asi aparecen en el estado de la red, en la linea y, si
 * nombran una estacion, en esa estacion.
 *
 * Igual que con el subte: si la pagina no responde o cambio de formato
 * (no se reconoce ninguna linea), no se toca nada de lo guardado.
 */
@Service
public class TrainNoticesSyncService {

    private static final Logger log = LoggerFactory.getLogger(TrainNoticesSyncService.class);

    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }
    static final String SOURCE_NAME = "Trenes Argentinos";
    static final String ID_PREFIX = "trenes-ar:";

    private final String url;
    private final RestClient restClient;
    private final AlertRepository alertRepository;
    private final TransportLineRepository lineRepository;
    private final TransactionTemplate transactionTemplate;

    public TrainNoticesSyncService(
            @Value("${app.trenes.avisos-url:https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades}")
            String url,
            AlertRepository alertRepository, TransportLineRepository lineRepository,
            PlatformTransactionManager transactionManager) {
        this.url = url;
        this.alertRepository = alertRepository;
        this.lineRepository = lineRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(15_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory)
                .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
    }

    @Scheduled(initialDelay = 45_000, fixedDelay = 15 * 60 * 1000L)
    public void sync() {
        String html;
        try {
            html = restClient.get().uri(url).retrieve().body(String.class);
        } catch (RestClientException e) {
            String reason = e instanceof RestClientResponseException r
                    ? "HTTP " + r.getStatusCode().value()
                    : e.getMostSpecificCause().getClass().getSimpleName();
            health.fail(SourceHealth.Source.TRENES_AVISOS, reason);
            log.warn("Avisos de Trenes Argentinos: la pagina no respondio ({}); no se toca nada.", reason);
            return;
        }
        Result result = TrainNoticesParser.parse(html);
        if (result.sectionsFound() == 0) {
            health.fail(SourceHealth.Source.TRENES_AVISOS, "la página cambió de formato");
            log.warn("Avisos de Trenes Argentinos: no se reconocio ninguna linea (cambio la pagina?); no se toca nada.");
            return;
        }
        try {
            transactionTemplate.executeWithoutResult(status -> apply(result.notices()));
            health.ok(SourceHealth.Source.TRENES_AVISOS);
        } catch (Exception e) {
            health.fail(SourceHealth.Source.TRENES_AVISOS, "error al guardar");
            log.error("Avisos de Trenes Argentinos: error al guardar ({})", e.getClass().getSimpleName());
        }
    }

    private void apply(List<TrainNotice> notices) {
        Set<String> present = new HashSet<>();
        int created = 0;
        for (TrainNotice notice : notices) {
            TransportLine line = lineRepository.findByModeAndCodeIgnoreCase(TransportMode.TREN, notice.lineCode())
                    .orElse(null);
            if (line == null) {
                continue;
            }
            String externalId = externalId(notice);
            present.add(externalId);
            if (alertRepository.findByExternalId(externalId).isEmpty()) {
                alertRepository.save(new Alert(line, notice.type(), notice.description(), SOURCE_NAME, externalId,
                        null, null));
                created++;
            }
        }
        // Los avisos que ya no estan en la pagina se dan de baja (solo los de esta fuente).
        List<Alert> gone = alertRepository.findByActiveTrueAndExternalIdIsNotNull().stream()
                .filter(a -> SOURCE_NAME.equals(a.getSource()))
                .filter(a -> !present.contains(a.getExternalId()))
                .toList();
        gone.forEach(a -> a.setActive(false));
        // Un aviso dado de baja que vuelve a aparecer se reactiva.
        for (String id : present) {
            alertRepository.findByExternalId(id).filter(a -> !a.isActive()).ifPresent(a -> a.setActive(true));
        }
        log.info("Avisos de Trenes Argentinos: {} vigentes, {} nuevos, {} dados de baja.",
                present.size(), created, gone.size());
    }

    /** Id estable por linea y texto: si el aviso cambia de texto, es otro aviso. */
    static String externalId(TrainNotice notice) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest((notice.lineCode() + "|" + notice.description()).getBytes(StandardCharsets.UTF_8));
            return ID_PREFIX + notice.lineCode() + ":" + HexFormat.of().formatHex(hash, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
