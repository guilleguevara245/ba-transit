package com.batransit.api.clima;

import com.batransit.api.estado.SourceHealth;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pronostico por hora para un punto del AMBA: Open-Meteo y, si no responde,
 * MET Norway como respaldo (ver MetNorwayForecast).
 *
 * El navegador nunca le pide a Open-Meteo: pide aca, con las coordenadas ya
 * redondeadas a una grilla de 0,05 grados (unos 5 km), y el servidor vuelve
 * a redondear. Cada celda de la grilla se consulta como mucho una vez cada
 * 45 minutos, asi que muchos usuarios de la misma zona comparten una sola
 * consulta. Si Open-Meteo falla se devuelve lo ultimo que se tenga (hasta 6
 * horas). Las coordenadas no se loguean.
 */
@Service
public class ForecastService {

    private static final Logger log = LoggerFactory.getLogger(ForecastService.class);

    /** Tamaño de la celda en grados (1/20 = 0,05). */
    static final int GRID_PER_DEGREE = 20;
    static final Duration FRESH = Duration.ofMinutes(45);
    static final Duration STALE_LIMIT = Duration.ofHours(6);
    /** Celdas guardadas como mucho (el AMBA entero son unas 1.000; en la practica, muchas menos). */
    static final int MAX_CELLS = 600;
    static final int HOURS = 24;

    /** El AMBA con margen (de Campana a La Plata y de Cañuelas a Pilar y Dr. Cabred). */
    static final double MIN_LAT = -35.5;
    static final double MAX_LAT = -34.0;
    static final double MIN_LON = -59.5;
    static final double MAX_LON = -57.7;

    public record Forecast(double latitude, double longitude, Current current, List<Hour> hours, Day today,
                           Instant updatedAt) {
    }

    /** Ahora. code: codigo de tiempo de la OMM (el mismo que usa el sitio para el icono). */
    public record Current(String time, double temperature, double feelsLike, int code, boolean isDay,
                          double precipitation, double wind) {
    }

    /** Una hora. rainChance: probabilidad de lluvia en % (null si el modelo no la da). */
    public record Hour(String time, double temperature, double feelsLike, Integer rainChance, double rain, int code,
                       double wind, boolean isDay) {
    }

    /** El dia de hoy. */
    public record Day(Double max, Double min, String sunrise, String sunset, Double uvMax, Integer rainChanceMax) {
    }

    private record Cached(Forecast forecast, Instant fetchedAt) {
    }

    private SourceHealth health = SourceHealth.NOOP;

    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    private final String baseUrl;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    /**
     * Pausa de cada proveedor despues de una falla: si responde 429 (limite
     * de consultas: en Render la IP de salida es compartida con otros sitios)
     * se respeta su Retry-After o se espera cada vez mas (1, 2, 5, 10 y 30
     * minutos), en vez de insistir con cada visita.
     */
    private final Map<String, Instant> pausedUntil = new ConcurrentHashMap<>();
    private final Map<String, Integer> strikes = new ConcurrentHashMap<>();
    static final Duration[] BACKOFF = {Duration.ofMinutes(1), Duration.ofMinutes(2), Duration.ofMinutes(5),
            Duration.ofMinutes(10), Duration.ofMinutes(30)};
    static final String OPEN_METEO = "Open-Meteo";
    static final String MET_NORWAY = "MET Norway";
    private final Map<String, Object> locks = new ConcurrentHashMap<>();

    public ForecastService(@Value("${app.open-meteo.url:https://api.open-meteo.com/v1/forecast}") String baseUrl,
                           ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(10_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory)
                .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
    }

    /** true si el punto esta dentro del AMBA (el servicio no pronostica para cualquier lugar del mundo). */
    public static boolean inArea(double lat, double lon) {
        return lat >= MIN_LAT && lat <= MAX_LAT && lon >= MIN_LON && lon <= MAX_LON;
    }

    /** El centro de la celda de la grilla (0,05 grados) que contiene el punto. */
    static double toGrid(double value) {
        return Math.round(value * GRID_PER_DEGREE) / (double) GRID_PER_DEGREE;
    }

    static String cellKey(double lat, double lon) {
        return String.format(Locale.ROOT, "%.2f,%.2f", toGrid(lat), toGrid(lon));
    }

    /** El pronostico para la celda del punto, o vacio si no hay datos (ni guardados). */
    public Optional<Forecast> forecast(double lat, double lon) {
        if (!inArea(lat, lon)) {
            return Optional.empty();
        }
        String key = cellKey(lat, lon);
        Cached cached = cache.get(key);
        if (cached != null && cached.fetchedAt().plus(FRESH).isAfter(Instant.now())) {
            return Optional.of(cached.forecast());
        }
        // Una sola consulta por celda a la vez: el resto espera y usa ese resultado.
        synchronized (locks.computeIfAbsent(key, k -> new Object())) {
            cached = cache.get(key);
            if (cached != null && cached.fetchedAt().plus(FRESH).isAfter(Instant.now())) {
                return Optional.of(cached.forecast());
            }
            Optional<Forecast> fresh = download(toGrid(lat), toGrid(lon));
            if (fresh.isPresent()) {
                cache.put(key, new Cached(fresh.get(), Instant.now()));
                trim();
                return fresh;
            }
            if (cached != null && cached.fetchedAt().plus(STALE_LIMIT).isAfter(Instant.now())) {
                return Optional.of(cached.forecast());
            }
            return Optional.empty();
        }
    }

    /** Si hay demasiadas celdas guardadas, se olvidan las mas viejas. */
    private void trim() {
        int extra = cache.size() - MAX_CELLS;
        if (extra <= 0) {
            return;
        }
        List<Map.Entry<String, Cached>> entries = new ArrayList<>(cache.entrySet());
        entries.sort(Comparator.comparing(e -> e.getValue().fetchedAt()));
        entries.stream().limit(extra).forEach(e -> {
            cache.remove(e.getKey());
            locks.remove(e.getKey());
        });
    }

    String url(double lat, double lon) {
        return baseUrl + String.format(Locale.ROOT, "?latitude=%.2f&longitude=%.2f", lat, lon)
                + "&current=temperature_2m,apparent_temperature,weather_code,is_day,precipitation,wind_speed_10m"
                + "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,"
                + "wind_speed_10m,is_day"
                + "&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max"
                + "&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=2";
    }

    /** La consulta HTTP (los tests la reemplazan por respuestas grabadas). */
    protected String fetch(String url) {
        return restClient.get().uri(URI.create(url)).retrieve().body(String.class);
    }

    @FunctionalInterface
    private interface Download {
        Forecast get() throws Exception;
    }

    /** Open-Meteo y, si no responde, MET Norway. */
    private Optional<Forecast> download(double lat, double lon) {
        Instant now = Instant.now();
        String[] reason = {null};
        Optional<Forecast> forecast = attempt(OPEN_METEO, reason,
                () -> parse(objectMapper.readTree(fetch(url(lat, lon))), lat, lon, now));
        if (forecast.isEmpty()) {
            forecast = attempt(MET_NORWAY, reason,
                    () -> MetNorwayForecast.parse(objectMapper.readTree(fetch(MetNorwayForecast.url(lat, lon))), lat, lon, now));
        }
        if (forecast.isPresent()) {
            health.ok(SourceHealth.Source.PRONOSTICO);
        } else {
            health.fail(SourceHealth.Source.PRONOSTICO, reason[0]);
        }
        return forecast;
    }

    private Optional<Forecast> attempt(String provider, String[] reason, Download download) {
        Instant paused = pausedUntil.get(provider);
        if (paused != null && paused.isAfter(Instant.now())) {
            if (reason[0] == null) {
                reason[0] = provider + " en pausa";
            }
            return Optional.empty();
        }
        try {
            Forecast forecast = download.get();
            strikes.remove(provider);
            pausedUntil.remove(provider);
            return Optional.of(forecast);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            String why = "HTTP " + status;
            pause(provider, status == 429 ? retryAfter(e) : null);
            if (reason[0] == null) {
                reason[0] = why;
            }
            // El motivo que da el proveedor (por ejemplo, "Hourly API request limit exceeded") va al log.
            log.warn("{} no respondio bien ({}): {}", provider, why, shortBody(e.getResponseBodyAsString()));
        } catch (RestClientException e) {
            pause(provider, null);
            if (reason[0] == null) {
                reason[0] = e.getMostSpecificCause().getClass().getSimpleName();
            }
            log.warn("{} no respondio ({})", provider, e.getMostSpecificCause().getClass().getSimpleName());
        } catch (Exception e) {
            pause(provider, null);
            if (reason[0] == null) {
                reason[0] = e.getClass().getSimpleName();
            }
            log.warn("{}: respuesta que no se pudo leer ({})", provider, e.getClass().getSimpleName());
        }
        return Optional.empty();
    }

    /** Pausa al proveedor: lo que pidio (Retry-After) o cada vez mas larga. */
    void pause(String provider, Duration requested) {
        int n = strikes.merge(provider, 1, Integer::sum);
        Duration wait = requested != null ? requested : BACKOFF[Math.min(n, BACKOFF.length) - 1];
        pausedUntil.put(provider, Instant.now().plus(wait));
    }

    boolean isPaused(String provider) {
        Instant until = pausedUntil.get(provider);
        return until != null && until.isAfter(Instant.now());
    }

    /** El Retry-After en segundos (entre 1 minuto y 1 hora), o null si no vino. */
    static Duration retryAfter(RestClientResponseException e) {
        try {
            String value = e.getResponseHeaders() == null ? null : e.getResponseHeaders().getFirst("Retry-After");
            if (value == null) {
                return null;
            }
            long seconds = Long.parseLong(value.trim());
            return Duration.ofSeconds(Math.max(60, Math.min(3600, seconds)));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String shortBody(String body) {
        if (body == null) {
            return "";
        }
        String flat = body.replaceAll("\\s+", " ").trim();
        return flat.length() > 160 ? flat.substring(0, 160) : flat;
    }

    /**
     * Arma el pronostico a partir de la respuesta. Las horas arrancan en la
     * hora actual (la de "current", en hora de Buenos Aires) y siguen HOURS
     * horas. Un dato que falta en una hora la saltea.
     */
    static Forecast parse(JsonNode root, double lat, double lon, Instant updatedAt) {
        JsonNode c = root.path("current");
        if (!c.path("temperature_2m").isNumber()) {
            throw new IllegalArgumentException("Respuesta sin datos actuales");
        }
        String nowTime = c.path("time").asText("");
        Current current = new Current(nowTime, c.path("temperature_2m").asDouble(),
                c.path("apparent_temperature").asDouble(c.path("temperature_2m").asDouble()),
                c.path("weather_code").asInt(0), c.path("is_day").asInt(1) != 0,
                c.path("precipitation").asDouble(0), c.path("wind_speed_10m").asDouble(0));

        JsonNode h = root.path("hourly");
        JsonNode times = h.path("time");
        // "2026-10-30T18:30" -> "2026-10-30T18:00": la hora en curso.
        String thisHour = nowTime.length() >= 13 ? nowTime.substring(0, 13) + ":00" : "";
        int start = 0;
        for (int i = 0; i < times.size(); i++) {
            if (times.get(i).asText().equals(thisHour)) {
                start = i;
                break;
            }
        }
        List<Hour> hours = new ArrayList<>();
        for (int i = start; i < times.size() && hours.size() < HOURS; i++) {
            JsonNode temp = h.path("temperature_2m").path(i);
            if (!temp.isNumber()) {
                continue;
            }
            JsonNode chance = h.path("precipitation_probability").path(i);
            hours.add(new Hour(times.get(i).asText(), temp.asDouble(),
                    h.path("apparent_temperature").path(i).asDouble(temp.asDouble()),
                    chance.isNumber() ? chance.asInt() : null,
                    h.path("precipitation").path(i).asDouble(0),
                    h.path("weather_code").path(i).asInt(0),
                    h.path("wind_speed_10m").path(i).asDouble(0),
                    h.path("is_day").path(i).asInt(1) != 0));
        }

        JsonNode d = root.path("daily");
        Day today = new Day(number(d.path("temperature_2m_max").path(0)), number(d.path("temperature_2m_min").path(0)),
                text(d.path("sunrise").path(0)), text(d.path("sunset").path(0)), number(d.path("uv_index_max").path(0)),
                d.path("precipitation_probability_max").path(0).isNumber()
                        ? d.path("precipitation_probability_max").path(0).asInt() : null);
        return new Forecast(lat, lon, current, List.copyOf(hours), today, updatedAt);
    }

    private static Double number(JsonNode node) {
        return node.isNumber() ? node.asDouble() : null;
    }

    private static String text(JsonNode node) {
        return node.isTextual() ? node.asText() : null;
    }
}
