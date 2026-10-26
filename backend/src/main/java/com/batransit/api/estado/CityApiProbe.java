package com.batransit.api.estado;

import com.batransit.api.config.TransporteApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicios de la API Transporte que hoy no funcionan (26/10/2026) y que
 * BA Transit podria usar si vuelven: semaforos (HTTP 500), eventos (ruta
 * dada de baja, HTTP 500) y los datos de movilidad (vienen vacios). Una vez
 * por semana, y un minuto despues de arrancar, se los prueba y el
 * resultado se muestra en "Estado de los datos". Lee como mucho
 * MAX_BYTES de cada respuesta y nunca loguea la URL (lleva las credenciales).
 */
@Component
public class CityApiProbe {

    private static final Logger log = LoggerFactory.getLogger(CityApiProbe.class);

    static final int MAX_BYTES = 4096;

    public record Probe(String key, String what, String use, String path) {
    }

    /** available: respondio 200 con datos. detail: el motivo si no. */
    public record Result(String key, String what, String use, boolean available, String detail, Instant checkedAt) {
    }

    static final List<Probe> PROBES = List.of(
            new Probe("semaforos", "Semáforos", "semáforos fuera de servicio en el mapa",
                    "/transito/v1/semaforos?lat=-34.6037&lon=-58.3816&radius=150"),
            new Probe("eventos", "Cortes y eventos de tránsito", "cortes y eventos en el inicio y en Accesos",
                    "/transito/v1/eventos?month=" + java.time.YearMonth.now() + "&provider=1"),
            new Probe("transito", "Conteo de tránsito", "tránsito comparado con un día normal en Accesos",
                    "/datos/movilidad/transito"),
            new Probe("transporte-publico", "Viajes en transporte público", "uso diario de subte, trenes y colectivos",
                    "/datos/movilidad/transportePublico"));

    private final TransporteApiProperties properties;
    private final Map<String, Result> results = new ConcurrentHashMap<>();

    public CityApiProbe(TransporteApiProperties properties) {
        this.properties = properties;
    }

    /** Lo ultimo que se sabe de cada servicio, en el orden de PROBES (vacio si todavia no se probo). */
    public List<Result> results() {
        return PROBES.stream().map(p -> results.get(p.key())).filter(r -> r != null).toList();
    }

    /** Al minuto de arrancar y despues cada 7 dias. Corre en su propio hilo: algunas tardan. */
    @Scheduled(initialDelay = 60_000L, fixedDelay = 7 * 24 * 60 * 60_000L)
    public void schedule() {
        if (properties.getClientId() == null || properties.getClientId().isBlank()) {
            return;
        }
        Thread thread = new Thread(this::probeAll, "prueba-api-ciudad");
        thread.setDaemon(true);
        thread.start();
    }

    void probeAll() {
        for (Probe probe : PROBES) {
            Result result = probe(probe);
            Result before = results.put(probe.key(), result);
            if (result.available() && (before == null || !before.available())) {
                log.info("API Transporte: '{}' volvio a responder con datos", probe.what());
            }
        }
    }

    private Result probe(Probe probe) {
        HttpURLConnection connection = null;
        try {
            String url = properties.getBaseUrl() + probe.path() + (probe.path().contains("?") ? "&" : "?")
                    + "client_id=" + URLEncoder.encode(properties.getClientId(), StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(properties.getClientSecret(), StandardCharsets.UTF_8);
            connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(60_000);
            int status = connection.getResponseCode();
            if (status >= 400) {
                return result(probe, false, "HTTP " + status);
            }
            InputStream body = connection.getInputStream();
            String text = body == null ? "" : new String(body.readNBytes(MAX_BYTES), StandardCharsets.UTF_8);
            return hasData(text) ? result(probe, true, null) : result(probe, false, "responde sin datos");
        } catch (Exception e) {
            return result(probe, false, e.getClass().getSimpleName());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    /** Vacio, [] o {} cuenta como "sin datos". */
    static boolean hasData(String body) {
        String trimmed = body == null ? "" : body.strip();
        return !(trimmed.isEmpty() || trimmed.equals("[]") || trimmed.equals("{}")
                || trimmed.matches("\\{\\s*\"list\"\\s*:\\s*\\[\\s*]\\s*}"));
    }

    private static Result result(Probe probe, boolean available, String detail) {
        return new Result(probe.key(), probe.what(), probe.use(), available, detail, Instant.now());
    }
}
