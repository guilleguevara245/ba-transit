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

    static final List<String> PATHS = List.of(
            "/colectivos/serviceAlerts?json=1",
            "/transito/v1/semaforos?lat=-34.6037&lon=-58.3816&radius=1000",
            "/datos/movilidad/transito",
            "/datos/movilidad/transito/semanaTipica",
            "/datos/movilidad/transportePublico");

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

    private void sample(String path) {
        HttpURLConnection connection = null;
        try {
            String url = properties.getBaseUrl() + path + (path.contains("?") ? "&" : "?")
                    + "client_id=" + URLEncoder.encode(properties.getClientId(), StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(properties.getClientSecret(), StandardCharsets.UTF_8);
            connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(30_000);
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
