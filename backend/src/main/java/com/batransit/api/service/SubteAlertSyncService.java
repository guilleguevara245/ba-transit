package com.batransit.api.service;

import com.batransit.api.client.SubteAlertsFeed;
import com.batransit.api.client.TransporteApiClient;
import com.batransit.api.client.TransporteApiException;
import com.batransit.api.domain.Alert;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Trae las alertas vigentes de subte desde la API Transporte y las
 * refleja en nuestra base: crea las nuevas, actualiza las que ya
 * existian (mismo externalId), y desactiva (no borra) las que ya no
 * estan en el feed porque se resolvieron.
 *
 * Principio central: si la fuente falla o responde algo invalido, no
 * se toca NADA de lo que ya hay guardado. Una fuente caida nunca debe
 * destruir datos.
 */
@Service
public class SubteAlertSyncService {

    private static final Logger log = LoggerFactory.getLogger(SubteAlertSyncService.class);
    private static final String SOURCE_NAME = "API Transporte";
    private static final String LINE_MODE = "SUBTE";

    private final TransporteApiClient apiClient;
    private final AlertRepository alertRepository;
    private final TransportLineRepository transportLineRepository;

    public SubteAlertSyncService(TransporteApiClient apiClient,
                                  AlertRepository alertRepository,
                                  TransportLineRepository transportLineRepository) {
        this.apiClient = apiClient;
        this.alertRepository = alertRepository;
        this.transportLineRepository = transportLineRepository;
    }

    @Transactional
    public void sync() {
        SubteAlertsFeed feed;
        try {
            feed = apiClient.fetchSubteAlerts();
        } catch (TransporteApiException e) {
            log.error("Sincronizacion de alertas de subte omitida esta vez: {}", e.getMessage());
            return;
        }

        if (feed == null || feed.entity() == null) {
            log.warn("La API Transporte devolvio una respuesta vacia o invalida; no se toca nada.");
            return;
        }

        List<String> seenExternalIds = new ArrayList<>();

        for (SubteAlertsFeed.FeedEntity entity : feed.entity()) {
            try {
                processEntity(entity);
                seenExternalIds.add(entity.id());
            } catch (Exception e) {
                // Una alerta con datos raros no debe tirar abajo la sincronizacion entera.
                log.warn("No se pudo procesar la alerta '{}': {}", entity.id(), e.getMessage());
            }
        }

        deactivateNoLongerPresent(seenExternalIds);
        log.info("Sincronizacion de alertas de subte: {} alertas vigentes en el feed.", seenExternalIds.size());
    }

    private void processEntity(SubteAlertsFeed.FeedEntity entity) {
        SubteAlertsFeed.FeedAlert alert = entity.alert();
        if (alert == null || alert.informedEntity() == null || alert.informedEntity().isEmpty()) {
            return;
        }

        String routeId = alert.informedEntity().get(0).routeId();
        String lineCode = extractLineCode(routeId);

        TransportLine line = transportLineRepository
                .findByModeIgnoreCaseAndCodeIgnoreCase(LINE_MODE, lineCode)
                .orElse(null);

        if (line == null) {
            log.warn("No existe una linea de subte con codigo '{}' (route_id original: '{}')", lineCode, routeId);
            return;
        }

        String description = firstText(alert.descriptionText());
        if (description == null) {
            description = firstText(alert.headerText());
        }
        if (description == null) {
            description = "Alerta sin descripcion (fuente: " + SOURCE_NAME + ")";
        }
        // Java exige que las variables usadas dentro de una lambda (mas abajo,
        // en ifPresentOrElse) sean "efectivamente finales": nunca reasignadas
        // despues de su valor inicial. Como "description" se reasigna arriba,
        // la copiamos a una variable final antes de usarla en la lambda.
        final String finalDescription = description;

        AlertType type = mapEffectToType(alert.effect());

        alertRepository.findByExternalId(entity.id()).ifPresentOrElse(
                existing -> existing.updateFromSource(type, finalDescription, alert.cause(), alert.effect()),
                () -> alertRepository.save(new Alert(
                        line, type, finalDescription, SOURCE_NAME, entity.id(), alert.cause(), alert.effect()))
        );
    }

    private void deactivateNoLongerPresent(List<String> seenExternalIds) {
        List<Alert> toDeactivate = alertRepository
                .findByActiveTrueAndExternalIdIsNotNullAndExternalIdNotIn(seenExternalIds);
        toDeactivate.forEach(a -> a.setActive(false));
    }

    /** "LineaA" -> "A". Si el formato cambiara, esto es lo unico que habria que tocar. */
    private String extractLineCode(String routeId) {
        if (routeId == null) {
            return "";
        }
        return routeId.replaceFirst("(?i)^linea", "").trim();
    }

    private String firstText(SubteAlertsFeed.TranslatedText translatedText) {
        if (translatedText == null || translatedText.translation() == null || translatedText.translation().isEmpty()) {
            return null;
        }
        return translatedText.translation().get(0).text();
    }

    /**
     * Mapeo aproximado de "effect" (GTFS-Realtime) a nuestro AlertType.
     * El valor original queda guardado en sourceEffect por si hay que
     * ajustar este mapeo mas adelante sin perder informacion.
     */
    private AlertType mapEffectToType(Integer effect) {
        if (effect == null) {
            return AlertType.DEMORA;
        }
        return switch (effect) {
            case 1 -> AlertType.INTERRUPCION;
            case 4 -> AlertType.DESVIO;
            case 2, 3, 6 -> AlertType.DEMORA;
            default -> AlertType.DEMORA;
        };
    }
}
