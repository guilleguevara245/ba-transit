package com.batransit.api.service;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.client.SubteAlertsFeed;
import com.batransit.api.client.TransporteApiClient;
import com.batransit.api.client.TransporteApiException;
import com.batransit.api.domain.Alert;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Trae las alertas vigentes de subte desde la API Transporte y las
 * refleja en nuestra base: crea las nuevas, actualiza las que ya
 * existian (mismo externalId), y desactiva (no borra) las que ya no
 * estan en el feed porque se resolvieron.
 *
 * Principio central: si la fuente falla o responde algo invalido, no
 * se toca NADA de lo que ya hay guardado. Una fuente caida nunca debe
 * destruir datos.
 *
 * La llamada HTTP (con sus reintentos) se hace FUERA de la transaccion:
 * asi no se retiene una conexion a la base mientras se espera a la API
 * externa. Solo la escritura corre dentro de la transaccion.
 */
@Service
public class SubteAlertSyncService {

    private static final Logger log = LoggerFactory.getLogger(SubteAlertSyncService.class);

    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }
    private static final String SOURCE_NAME = "API Transporte";

    /**
     * Cuando una misma alerta del feed afecta a varias lineas, se guarda
     * una Alert por linea con externalId = "<id del feed>#<codigo>". Las
     * alertas de una sola linea conservan el id del feed tal cual, igual
     * que antes de este cambio.
     */
    static final String MULTI_LINE_SEPARATOR = "#";

    private final TransporteApiClient apiClient;
    private final AlertRepository alertRepository;
    private final TransportLineRepository transportLineRepository;
    private final TransactionTemplate transactionTemplate;

    public SubteAlertSyncService(TransporteApiClient apiClient,
                                 AlertRepository alertRepository,
                                 TransportLineRepository transportLineRepository,
                                 PlatformTransactionManager transactionManager) {
        this.apiClient = apiClient;
        this.alertRepository = alertRepository;
        this.transportLineRepository = transportLineRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void sync() {
        SubteAlertsFeed feed;
        try {
            feed = apiClient.fetchSubteAlerts();
        } catch (TransporteApiException e) {
            health.fail(SourceHealth.Source.SUBTE_ALERTAS, "sin respuesta");
            log.error("Sincronizacion de alertas de subte omitida esta vez: {}", e.getMessage());
            return;
        }

        if (feed == null || feed.entity() == null) {
            health.fail(SourceHealth.Source.SUBTE_ALERTAS, "respuesta vacía");
            log.warn("La API Transporte devolvio una respuesta vacia o invalida; no se toca nada.");
            return;
        }

        transactionTemplate.executeWithoutResult(status -> applyFeed(feed));
        health.ok(SourceHealth.Source.SUBTE_ALERTAS);
    }

    private void applyFeed(SubteAlertsFeed feed) {
        // Se registran TODOS los ids del feed antes de procesarlos: si una
        // alerta falla al procesarse, igual sigue vigente en la fuente y
        // no debe desactivarse.
        Set<String> feedEntityIds = new HashSet<>();
        for (SubteAlertsFeed.FeedEntity entity : feed.entity()) {
            if (entity != null && entity.id() != null) {
                feedEntityIds.add(entity.id());
            }
        }

        for (SubteAlertsFeed.FeedEntity entity : feed.entity()) {
            try {
                processEntity(entity);
            } catch (Exception e) {
                // Una alerta con datos raros no debe tirar abajo la sincronizacion entera.
                log.warn("No se pudo procesar la alerta '{}': {}",
                        entity == null ? null : entity.id(), e.getMessage());
            }
        }

        int deactivated = deactivateNoLongerPresent(feedEntityIds);
        log.info("Sincronizacion de alertas de subte: {} alertas vigentes en el feed, {} desactivadas.",
                feedEntityIds.size(), deactivated);
    }

    private void processEntity(SubteAlertsFeed.FeedEntity entity) {
        if (entity == null || entity.id() == null) {
            return;
        }
        SubteAlertsFeed.FeedAlert alert = entity.alert();
        if (alert == null || alert.informedEntity() == null || alert.informedEntity().isEmpty()) {
            return;
        }

        // Una alerta puede afectar a varias lineas (ej. combinaciones).
        // Se toman los codigos distintos, conservando el orden del feed.
        Set<String> lineCodes = new LinkedHashSet<>();
        for (SubteAlertsFeed.InformedEntity informed : alert.informedEntity()) {
            if (informed != null) {
                String code = extractLineCode(informed.routeId());
                if (!code.isEmpty()) {
                    lineCodes.add(code);
                }
            }
        }

        String description = describe(alert);
        AlertType type = mapEffectToType(alert.effect());
        boolean multiLine = lineCodes.size() > 1;

        for (String lineCode : lineCodes) {
            TransportLine line = transportLineRepository
                    .findByModeAndCodeIgnoreCase(TransportMode.SUBTE, lineCode)
                    .orElse(null);

            if (line == null) {
                log.warn("No existe una linea de subte con codigo '{}' (alerta '{}')", lineCode, entity.id());
                continue;
            }

            String externalId = multiLine
                    ? entity.id() + MULTI_LINE_SEPARATOR + lineCode.toUpperCase()
                    : entity.id();

            alertRepository.findByExternalId(externalId).ifPresentOrElse(
                    existing -> existing.updateFromSource(type, description, alert.cause(), alert.effect()),
                    () -> alertRepository.save(new Alert(
                            line, type, description, SOURCE_NAME, externalId, alert.cause(), alert.effect()))
            );
        }
    }

    private int deactivateNoLongerPresent(Set<String> feedEntityIds) {
        // Solo las alertas que vinieron de este feed: las de otras fuentes
        // (por ejemplo, los avisos de Trenes Argentinos) tienen su propia sincronizacion.
        List<Alert> toDeactivate = alertRepository.findByActiveTrueAndExternalIdIsNotNull().stream()
                .filter(a -> SOURCE_NAME.equals(a.getSource()))
                .filter(a -> !feedEntityIds.contains(feedEntityIdOf(a.getExternalId())))
                .toList();
        toDeactivate.forEach(a -> a.setActive(false));
        return toDeactivate.size();
    }

    /** "Alerta_X#C" -> "Alerta_X"; "Alerta_Y" -> "Alerta_Y". */
    static String feedEntityIdOf(String externalId) {
        int separator = externalId.lastIndexOf(MULTI_LINE_SEPARATOR);
        return separator < 0 ? externalId : externalId.substring(0, separator);
    }

    private String describe(SubteAlertsFeed.FeedAlert alert) {
        String description = firstText(alert.descriptionText());
        if (description == null) {
            description = firstText(alert.headerText());
        }
        return Objects.requireNonNullElse(description, "Alerta sin descripcion (fuente: " + SOURCE_NAME + ")");
    }

    /** "LineaA" -> "A". Si el formato cambiara, esto es lo unico que habria que tocar. */
    static String extractLineCode(String routeId) {
        if (routeId == null) {
            return "";
        }
        return routeId.replaceFirst("(?i)^l[ií]nea", "").trim();
    }

    private String firstText(SubteAlertsFeed.TranslatedText translatedText) {
        if (translatedText == null || translatedText.translation() == null || translatedText.translation().isEmpty()) {
            return null;
        }
        String text = translatedText.translation().get(0).text();
        return (text == null || text.isBlank()) ? null : text;
    }

    /**
     * Mapeo aproximado de "effect" (GTFS-Realtime) a nuestro AlertType.
     * El valor original queda guardado en sourceEffect por si hay que
     * ajustar este mapeo mas adelante sin perder informacion.
     */
    static AlertType mapEffectToType(Integer effect) {
        if (effect == null) {
            return AlertType.DEMORA;
        }
        return switch (effect) {
            case 1 -> AlertType.INTERRUPCION;
            case 4 -> AlertType.DESVIO;
            default -> AlertType.DEMORA;
        };
    }
}
