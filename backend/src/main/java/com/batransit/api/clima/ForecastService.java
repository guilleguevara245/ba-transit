package com.batransit.api.clima;

import com.batransit.api.estado.SourceHealth;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pronostico por hora para un punto del AMBA, de Open-Meteo, con MET Norway
 * (el servicio meteorologico de Noruega) de respaldo.
 *
 * El navegador nunca le pide a ninguno de los dos: pide aca, con las
 * coordenadas ya redondeadas a una grilla de 0,05 grados (unos 5 km), y el
 * servidor vuelve a redondear. Cada celda de la grilla se consulta como mucho
 * una vez cada 45 minutos, asi que muchos usuarios de la misma zona comparten
 * una sola consulta. Si Open-Meteo no responde (por ejemplo, porque se agoto
 * el limite diario de la IP de salida, que en Render es compartida) se le
 * pide a MET Norway; si tampoco, se devuelve lo ultimo que se tenga (hasta 6
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

    /**
     * Ahora. code: codigo de tiempo de la OMM (el mismo que usa el sitio para
     * el icono). humidity: humedad relativa en % (null si no viene).
     */
    public record Current(String time, double temperature, double feelsLike, int code, boolean isDay,
                          double precipitation, double wind, Integer humidity) {
    }

    /** Una hora. rainChance: probabilidad de lluvia en % (null si el modelo no la da). */
    public record Hour(String time, double temperature, double feelsLike, Integer rainChance, double rain, int code,
                       double wind, boolean isDay) {
    }

    /** El dia de hoy (y la salida del sol de mañana, para la noche). */
    public record Day(Double max, Double min, String sunrise, String sunset, Double uvMax, Integer rainChanceMax,
                      String sunriseTomorrow) {
    }

    private record Cached(Forecast forecast, Instant fetchedAt) {
    }

    private SourceHealth health = SourceHealth.NOOP;

    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    private final String baseUrl;
    private final String metUrl;
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
    static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter LOCAL_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private final Map<String, Object> locks = new ConcurrentHashMap<>();

    public ForecastService(@Value("${app.open-meteo.url:https://api.open-meteo.com/v1/forecast}") String baseUrl,
                           @Value("${app.met-norway.url:https://api.met.no/weatherapi/locationforecast/2.0/complete}")
                           String metUrl,
                           ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.metUrl = metUrl;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(10_000);
        // MET Norway pide que cada sitio se identifique con su nombre y una forma de contacto.
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
            Forecast previous = cached == null ? null : cached.forecast();
            Optional<Forecast> fresh = download(toGrid(lat), toGrid(lon)).map(f -> keepDay(f, previous));
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

    /**
     * Pide el pronostico del centro (el Obelisco) al arrancar y cada 45
     * minutos. Asi la pagina de estado sabe enseguida que proveedor responde:
     * el navegador guarda el pronostico 10 minutos, y despues de un reinicio
     * el sitio puede mostrar el clima sin que el servidor haya consultado
     * todavia. Tambien deja lista la celda mas pedida.
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 45 * 60 * 1000L)
    public void checkCenter() {
        forecast(CENTER_LAT, CENTER_LON);
    }

    static final double CENTER_LAT = -34.6037;
    static final double CENTER_LON = -58.3816;

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
                + "&current=temperature_2m,apparent_temperature,weather_code,is_day,precipitation,wind_speed_10m,"
                + "relative_humidity_2m"
                + "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,"
                + "wind_speed_10m,is_day"
                + "&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max"
                + "&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=2";
    }

    String metUrl(double lat, double lon) {
        return metUrl + String.format(Locale.ROOT, "?lat=%.2f&lon=%.2f", lat, lon);
    }

    /** La consulta HTTP (los tests la reemplazan por respuestas grabadas). */
    protected String fetch(String url) {
        return restClient.get().uri(URI.create(url)).retrieve().body(String.class);
    }

    @FunctionalInterface
    private interface Download {
        Forecast get() throws Exception;
    }

    /**
     * El pronostico de Open-Meteo o, si no responde o esta en pausa, el de MET
     * Norway (vacio si ninguno de los dos).
     */
    private Optional<Forecast> download(double lat, double lon) {
        Instant now = Instant.now();
        Optional<Forecast> forecast = attempt(OPEN_METEO, SourceHealth.Source.PRONOSTICO,
                () -> parse(objectMapper.readTree(fetch(url(lat, lon))), lat, lon, now));
        if (forecast.isEmpty()) {
            forecast = attempt(MET_NORWAY, SourceHealth.Source.PRONOSTICO_RESPALDO,
                    () -> parseMet(objectMapper.readTree(fetch(metUrl(lat, lon))), lat, lon, now));
        }
        return forecast;
    }

    /**
     * Le pide el pronostico a un proveedor, salvo que este en pausa, y anota
     * en la pagina de estado como le fue (cada proveedor tiene su fila; una
     * pausa no cuenta como otra falla).
     */
    private Optional<Forecast> attempt(String provider, SourceHealth.Source source, Download download) {
        Instant paused = pausedUntil.get(provider);
        if (paused != null && paused.isAfter(Instant.now())) {
            return Optional.empty();
        }
        try {
            Forecast forecast = download.get();
            strikes.remove(provider);
            pausedUntil.remove(provider);
            health.ok(source);
            return Optional.of(forecast);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            String why = "HTTP " + status;
            pause(provider, status == 429 ? retryAfter(e) : null);
            health.fail(source, why);
            // El motivo que da el proveedor (por ejemplo, "Hourly API request limit exceeded") va al log.
            log.warn("{} no respondio bien ({}): {}", provider, why, shortBody(e.getResponseBodyAsString()));
        } catch (RestClientException e) {
            pause(provider, null);
            health.fail(source, e.getMostSpecificCause().getClass().getSimpleName());
            log.warn("{} no respondio ({})", provider, e.getMostSpecificCause().getClass().getSimpleName());
        } catch (Exception e) {
            pause(provider, null);
            health.fail(source, e.getClass().getSimpleName());
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
                c.path("precipitation").asDouble(0), c.path("wind_speed_10m").asDouble(0),
                c.path("relative_humidity_2m").isNumber() ? (int) Math.round(c.path("relative_humidity_2m").asDouble()) : null);

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
                        ? d.path("precipitation_probability_max").path(0).asInt() : null,
                text(d.path("sunrise").path(1)));
        return new Forecast(lat, lon, current, List.copyOf(hours), today, updatedAt);
    }

    /**
     * Arma el pronostico a partir de la respuesta de MET Norway
     * (locationforecast 2.0 "complete"). Viene en UTC y paso a paso: se pasa a
     * hora de Buenos Aires y se toman los pasos de una hora (los primeros dos
     * dias y medio), desde la hora en curso. Lo que MET Norway no da se arma:
     * la salida y la puesta del sol se calculan, el codigo de la OMM sale del
     * simbolo y el viento pasa de m/s a km/h. No da probabilidad de lluvia
     * (queda null: el sitio usa los milimetros). La maxima y la minima de hoy
     * solo se dan si el pronostico cubre el dia desde la madrugada; si no,
     * quedan null (y {@link #keepDay} conserva las de Open-Meteo).
     */
    static Forecast parseMet(JsonNode root, double lat, double lon, Instant now) {
        List<JsonNode> steps = new ArrayList<>();
        List<Instant> times = new ArrayList<>();
        for (JsonNode s : root.path("properties").path("timeseries")) {
            if (!s.path("data").path("instant").path("details").path("air_temperature").isNumber()
                    || !s.path("data").path("next_1_hours").isObject()) {
                continue;
            }
            steps.add(s.path("data"));
            times.add(Instant.parse(s.path("time").asText()));
        }
        if (steps.isEmpty()) {
            throw new IllegalArgumentException("Respuesta sin pasos por hora");
        }
        int start = 0;
        for (int i = 0; i < times.size(); i++) {
            if (!times.get(i).isAfter(now)) {
                start = i;
            }
        }
        List<Hour> hours = new ArrayList<>();
        for (int i = start; i < steps.size() && hours.size() < HOURS; i++) {
            hours.add(metHour(steps.get(i), times.get(i), lat, lon));
        }

        Hour first = hours.get(0);
        JsonNode details = steps.get(start).path("instant").path("details");
        // Como Open-Meteo: la hora de "ahora" es el comienzo del cuarto de hora en curso.
        LocalDateTime local = LocalDateTime.ofInstant(now, BUENOS_AIRES).truncatedTo(ChronoUnit.MINUTES);
        String nowTime = local.withMinute(local.getMinute() / 15 * 15).format(LOCAL_TIME);
        Current current = new Current(nowTime, first.temperature(), first.feelsLike(), first.code(), first.isDay(),
                first.rain(), first.wind(),
                details.path("relative_humidity").isNumber()
                        ? (int) Math.round(details.path("relative_humidity").asDouble()) : null);

        LocalDate today = local.toLocalDate();
        String date = today.toString();
        Double max = null;
        Double min = null;
        Double uvMax = null;
        Integer rainChanceMax = null;
        List<Hour> todayHours = hours.stream().filter(h -> h.time().startsWith(date)).toList();
        if (!todayHours.isEmpty() && Integer.parseInt(todayHours.get(0).time().substring(11, 13)) <= 6) {
            max = todayHours.stream().mapToDouble(Hour::temperature).max().orElseThrow();
            min = todayHours.stream().mapToDouble(Hour::temperature).min().orElseThrow();
        }
        for (int i = start; i < steps.size(); i++) {
            if (!localTime(times.get(i)).startsWith(date)) {
                continue;
            }
            JsonNode uv = steps.get(i).path("instant").path("details").path("ultraviolet_index_clear_sky");
            if (uv.isNumber()) {
                uvMax = uvMax == null ? uv.asDouble() : Math.max(uvMax, uv.asDouble());
            }
        }
        for (Hour h : todayHours) {
            if (h.rainChance() != null) {
                rainChanceMax = rainChanceMax == null ? h.rainChance() : Math.max(rainChanceMax, h.rainChance());
            }
        }
        Instant[] sun = sunTimes(today, lat, lon);
        Instant[] sunTomorrow = sunTimes(today.plusDays(1), lat, lon);
        Day day = new Day(max, min, sun == null ? null : localTime(sun[0]), sun == null ? null : localTime(sun[1]),
                uvMax, rainChanceMax, sunTomorrow == null ? null : localTime(sunTomorrow[0]));
        return new Forecast(lat, lon, current, List.copyOf(hours), day, now);
    }

    /** Un paso de una hora de MET Norway. */
    private static Hour metHour(JsonNode data, Instant time, double lat, double lon) {
        JsonNode d = data.path("instant").path("details");
        JsonNode next = data.path("next_1_hours");
        double temperature = d.path("air_temperature").asDouble();
        double windMs = d.path("wind_speed").asDouble(0);
        Double humidity = d.path("relative_humidity").isNumber() ? d.path("relative_humidity").asDouble() : null;
        double feelsLike = d.path("apparent_air_temperature").isNumber()
                ? d.path("apparent_air_temperature").asDouble() : apparent(temperature, humidity, windMs);
        String symbol = next.path("summary").path("symbol_code").asText("");
        JsonNode chance = next.path("details").path("probability_of_precipitation");
        return new Hour(localTime(time), temperature, feelsLike,
                chance.isNumber() ? (int) Math.round(chance.asDouble()) : null,
                next.path("details").path("precipitation_amount").asDouble(0), wmo(symbol),
                Math.round(windMs * 36) / 10.0, isDay(symbol, time, lat, lon));
    }

    /**
     * El simbolo de MET Norway ("lightrainshowers_day") como codigo de tiempo
     * de la OMM, el que usa el sitio para el icono. Uno desconocido, nublado.
     */
    static int wmo(String symbol) {
        String base = symbol.replaceAll("_(day|night|polartwilight)$", "");
        if (base.contains("thunder")) {
            return 95;
        }
        return switch (base) {
            case "clearsky" -> 0;
            case "fair" -> 1;
            case "partlycloudy" -> 2;
            case "fog" -> 45;
            case "lightrain" -> 61;
            case "rain" -> 63;
            case "heavyrain" -> 65;
            case "lightrainshowers" -> 80;
            case "rainshowers" -> 81;
            case "heavyrainshowers" -> 82;
            case "lightsleet", "lightsleetshowers" -> 66;
            case "sleet", "heavysleet", "sleetshowers", "heavysleetshowers" -> 67;
            case "lightsnow" -> 71;
            case "snow" -> 73;
            case "heavysnow" -> 75;
            case "lightsnowshowers", "snowshowers" -> 85;
            case "heavysnowshowers" -> 86;
            default -> 3;
        };
    }

    /** De dia segun el simbolo; si el simbolo no lo dice (nublado, lluvia), segun el sol. */
    private static boolean isDay(String symbol, Instant time, double lat, double lon) {
        if (symbol.endsWith("_night")) {
            return false;
        }
        if (symbol.endsWith("_day") || symbol.endsWith("_polartwilight")) {
            return true;
        }
        Instant[] sun = sunTimes(LocalDate.ofInstant(time, BUENOS_AIRES), lat, lon);
        return sun != null && !time.isBefore(sun[0]) && time.isBefore(sun[1]);
    }

    /** Sensacion termica (la formula de Steadman, la misma de Open-Meteo), si MET Norway no la da. */
    static double apparent(double temperature, Double humidity, double windMs) {
        if (humidity == null) {
            return temperature;
        }
        double vapour = humidity / 100 * 6.105 * Math.exp(17.27 * temperature / (237.7 + temperature));
        return Math.round((temperature + 0.33 * vapour - 0.70 * windMs - 4.00) * 10) / 10.0;
    }

    /**
     * Salida y puesta del sol de un dia (la ecuacion de la salida del sol, con
     * la refraccion y el tamaño del disco), o null si ese dia no sale o no se
     * pone. Da lo mismo que Open-Meteo con un minuto de diferencia.
     */
    static Instant[] sunTimes(LocalDate date, double lat, double lon) {
        long n = date.toEpochDay() - LocalDate.of(2000, 1, 1).toEpochDay();
        double jStar = n - lon / 360.0;
        double m = Math.toRadians((357.5291 + 0.98560028 * jStar) % 360);
        double c = 1.9148 * Math.sin(m) + 0.0200 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m);
        double lambda = Math.toRadians((Math.toDegrees(m) + c + 180 + 102.9372) % 360);
        double transit = 2451545.0 + jStar + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * lambda);
        double declination = Math.asin(Math.sin(lambda) * Math.sin(Math.toRadians(23.4397)));
        double phi = Math.toRadians(lat);
        double cosW = (Math.sin(Math.toRadians(-0.833)) - Math.sin(phi) * Math.sin(declination))
                / (Math.cos(phi) * Math.cos(declination));
        if (cosW < -1 || cosW > 1) {
            return null;
        }
        double half = Math.toDegrees(Math.acos(cosW)) / 360.0;
        return new Instant[]{julian(transit - half), julian(transit + half)};
    }

    private static Instant julian(double day) {
        return Instant.ofEpochMilli(Math.round((day - 2440587.5) * 86_400_000L));
    }

    /** "2026-11-14T13:00": la hora de Buenos Aires, redondeada al minuto, como la da Open-Meteo. */
    static String localTime(Instant time) {
        return LocalDateTime.ofInstant(time.plusSeconds(30), BUENOS_AIRES).truncatedTo(ChronoUnit.MINUTES)
                .format(LOCAL_TIME);
    }

    /**
     * Si el pronostico nuevo no trae la maxima y la minima de hoy (MET Norway
     * solo pronostica de ahora en adelante) y el anterior de la misma celda si,
     * del mismo dia, se conservan las de antes (y el UV maximo), ampliadas con
     * las horas nuevas.
     */
    static Forecast keepDay(Forecast fresh, Forecast old) {
        Day d = fresh.today();
        Day before = old == null ? null : old.today();
        if (d == null || d.max() != null || before == null || before.max() == null || before.min() == null
                || d.sunrise() == null || before.sunrise() == null
                || !d.sunrise().regionMatches(0, before.sunrise(), 0, 10)) {
            return fresh;
        }
        String date = d.sunrise().substring(0, 10);
        double max = before.max();
        double min = before.min();
        for (Hour h : fresh.hours()) {
            if (h.time().startsWith(date)) {
                max = Math.max(max, h.temperature());
                min = Math.min(min, h.temperature());
            }
        }
        Day merged = new Day(max, min, d.sunrise(), d.sunset(), before.uvMax() != null ? before.uvMax() : d.uvMax(),
                before.rainChanceMax() != null ? before.rainChanceMax() : d.rainChanceMax(), d.sunriseTomorrow());
        return new Forecast(fresh.latitude(), fresh.longitude(), fresh.current(), fresh.hours(), merged,
                fresh.updatedAt());
    }

    private static Double number(JsonNode node) {
        return node.isNumber() ? node.asDouble() : null;
    }

    private static String text(JsonNode node) {
        return node.isTextual() ? node.asText() : null;
    }
}
