package com.batransit.api.live;

import com.batransit.api.config.TransporteApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Herramienta temporal: un minuto despues de arrancar consulta una vez
 * algunas rutas de la API Transporte que todavia no se usan y deja en el
 * log el comienzo de cada respuesta (MUESTRA API ...), para ver su formato
 * real antes de programar. Lee como mucho MAX_BYTES por ruta (algunas son
 * muy grandes) y nunca loguea la URL, que lleva las credenciales.
 * Se apaga con app.muestras.enabled=false (variable MUESTRAS_API).
 */
@Component
public class ApiSampleLogger {

    private static final Logger log = LoggerFactory.getLogger(ApiSampleLogger.class);

    static final int MAX_BYTES = 3000;

    /** Rutas de las que se loguea el comienzo de la respuesta. */
    static final List<String> PATHS = List.of(
            "/transito/v1/semaforos?lat=-34.6037&lon=-58.3816&radius=150",
            "/transito/v1/semaforos?lat=-34.6037&lon=-58.3816&radius=400");

    /** Alertas de colectivos: se lee todo y se loguea un resumen de cada alerta. */
    static final String BUS_ALERTS = "/colectivos/serviceAlerts?json=1";

    private final TransporteApiProperties properties;
    private final boolean enabled;

    public ApiSampleLogger(TransporteApiProperties properties,
                           @Value("${app.muestras.enabled:true}") boolean enabled) {
        this.properties = properties;
        this.enabled = enabled;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (!enabled || properties.getClientId() == null || properties.getClientId().isBlank()) {
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                Thread.sleep(60_000);
                summarizeBusAlerts();
                for (String path : PATHS) {
                    sample(path);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "muestras-api");
        thread.setDaemon(true);
        thread.start();
    }

    private String url(String path) {
        return properties.getBaseUrl() + path + (path.contains("?") ? "&" : "?")
                + "client_id=" + URLEncoder.encode(properties.getClientId(), StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(properties.getClientSecret(), StandardCharsets.UTF_8);
    }

    /**
     * Cuantas alertas hay y, de cada una: efecto, causa, titulo, cuantas
     * paradas nombra y si trae route_id (para saber como asociarlas a las lineas).
     */
    private void summarizeBusAlerts() {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) URI.create(url(BUS_ALERTS)).toURL().openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(60_000);
            int status = connection.getResponseCode();
            if (status >= 400) {
                log.info("MUESTRA API {} -> HTTP {}", BUS_ALERTS, status);
                return;
            }
            com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readTree(connection.getInputStream());
            com.fasterxml.jackson.databind.JsonNode entities = root.path("_entity");
            log.info("MUESTRA API {} -> {} alertas; campos de la raiz: {}", BUS_ALERTS, entities.size(),
                    iterable(root.fieldNames()));
            int i = 0;
            for (com.fasterxml.jackson.databind.JsonNode entity : entities) {
                if (i++ >= 60) {
                    break;
                }
                com.fasterxml.jackson.databind.JsonNode alert = entity.path("_alert");
                com.fasterxml.jackson.databind.JsonNode informed = alert.path("_informed_entity");
                java.util.Set<String> routes = new java.util.TreeSet<>();
                java.util.Set<String> agencies = new java.util.TreeSet<>();
                for (com.fasterxml.jackson.databind.JsonNode e : informed) {
                    if (!e.path("_route_id").isNull() && !e.path("_route_id").isMissingNode()) {
                        routes.add(e.path("_route_id").asText());
                    }
                    if (!e.path("_agency_id").isNull() && !e.path("_agency_id").isMissingNode()) {
                        agencies.add(e.path("_agency_id").asText());
                    }
                }
                log.info("MUESTRA ALERTA {} | efecto {} causa {} | periodos {} | {} entidades, rutas {}, empresas {} | {} | {}",
                        i, alert.path("_effect").asText(), alert.path("_cause").asText(),
                        alert.path("_active_period"), informed.size(), routes, agencies,
                        text(alert.path("_header_text")), cut(text(alert.path("_description_text")), 300));
            }
        } catch (Exception e) {
            log.info("MUESTRA API {} -> fallo ({})", BUS_ALERTS, e.getClass().getSimpleName());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private static String text(com.fasterxml.jackson.databind.JsonNode translated) {
        com.fasterxml.jackson.databind.JsonNode list = translated.path("_translation");
        return list.size() > 0 ? list.get(0).path("_text").asText() : "";
    }

    private static String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    private static List<String> iterable(java.util.Iterator<String> it) {
        List<String> out = new java.util.ArrayList<>();
        it.forEachRemaining(out::add);
        return out;
    }

    private void sample(String path) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) URI.create(url(path)).toURL().openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(90_000);
            int status = connection.getResponseCode();
            InputStream body = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            byte[] bytes = body == null ? new byte[0] : body.readNBytes(MAX_BYTES);
            String text = new String(bytes, StandardCharsets.UTF_8).replaceAll("\\s+", " ");
            log.info("MUESTRA API {} -> HTTP {} {} | {}", path, status,
                    connection.getContentType(), text);
        } catch (Exception e) {
            log.info("MUESTRA API {} -> fallo ({})", path, e.getClass().getSimpleName());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
