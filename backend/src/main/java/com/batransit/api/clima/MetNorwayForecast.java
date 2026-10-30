package com.batransit.api.clima;

import com.batransit.api.clima.ForecastService.Current;
import com.batransit.api.clima.ForecastService.Day;
import com.batransit.api.clima.ForecastService.Forecast;
import com.batransit.api.clima.ForecastService.Hour;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Respaldo del pronostico: MET Norway (Instituto Meteorologico de Noruega,
 * locationforecast 2.0 "compact", datos con licencia CC BY 4.0). Se usa solo
 * si Open-Meteo no responde. Se lleva al mismo formato: horas en hora de
 * Buenos Aires, viento en km/h y el estado del cielo como codigo de la OMM
 * (el que usa el sitio para los iconos). No trae sensacion termica ni
 * salida y puesta del sol.
 */
final class MetNorwayForecast {

    private MetNorwayForecast() {
    }

    static final String URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter LOCAL = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    /** Simbolos de MET (sin el sufijo _day/_night) -> codigo de la OMM. */
    static final Map<String, Integer> CODES = Map.ofEntries(
            Map.entry("clearsky", 0), Map.entry("fair", 1), Map.entry("partlycloudy", 2), Map.entry("cloudy", 3),
            Map.entry("fog", 45), Map.entry("lightrain", 61), Map.entry("rain", 63), Map.entry("heavyrain", 65),
            Map.entry("lightrainshowers", 80), Map.entry("rainshowers", 81), Map.entry("heavyrainshowers", 82),
            Map.entry("lightsleet", 66), Map.entry("sleet", 67), Map.entry("heavysleet", 67),
            Map.entry("lightsleetshowers", 66), Map.entry("sleetshowers", 67), Map.entry("heavysleetshowers", 67),
            Map.entry("lightsnow", 71), Map.entry("snow", 73), Map.entry("heavysnow", 75),
            Map.entry("lightsnowshowers", 85), Map.entry("snowshowers", 85), Map.entry("heavysnowshowers", 86));

    static String url(double lat, double lon) {
        return URL + String.format(Locale.ROOT, "?lat=%.2f&lon=%.2f", lat, lon);
    }

    /** "rainshowers_day" -> 81; con tormenta ("...andthunder") -> 95; desconocido -> 3 (nublado). */
    static int code(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return 3;
        }
        String base = symbol.replaceAll("_(day|night|polartwilight)$", "");
        if (base.contains("thunder")) {
            return 95;
        }
        return CODES.getOrDefault(base, 3);
    }

    static boolean isDay(String symbol, int hour) {
        if (symbol != null && symbol.endsWith("_night")) {
            return false;
        }
        if (symbol != null && symbol.endsWith("_day")) {
            return true;
        }
        return hour >= 7 && hour <= 19;
    }

    static Forecast parse(JsonNode root, double lat, double lon, Instant updatedAt) {
        JsonNode series = root.path("properties").path("timeseries");
        if (!series.isArray() || series.isEmpty()) {
            throw new IllegalArgumentException("Respuesta de MET sin datos");
        }
        List<Hour> hours = new ArrayList<>();
        String today = null;
        Double max = null;
        Double min = null;
        Integer chanceMax = null;
        for (JsonNode entry : series) {
            JsonNode details = entry.path("data").path("instant").path("details");
            JsonNode temp = details.path("air_temperature");
            if (!temp.isNumber()) {
                continue;
            }
            LocalDateTime local = LocalDateTime.ofInstant(Instant.parse(entry.path("time").asText()), BUENOS_AIRES);
            String time = local.format(LOCAL);
            if (today == null) {
                today = time.substring(0, 10);
            }
            JsonNode next = entry.path("data").path("next_1_hours");
            String symbol = next.path("summary").path("symbol_code").asText(null);
            JsonNode chance = next.path("details").path("probability_of_precipitation");
            Integer rainChance = chance.isNumber() ? (int) Math.round(chance.asDouble()) : null;
            if (time.startsWith(today)) {
                max = max == null ? temp.asDouble() : Math.max(max, temp.asDouble());
                min = min == null ? temp.asDouble() : Math.min(min, temp.asDouble());
                if (rainChance != null) {
                    chanceMax = chanceMax == null ? rainChance : Math.max(chanceMax, rainChance);
                }
            }
            // Solo las primeras horas (las de paso horario; despues MET pasa a cada 6 horas).
            if (hours.size() < ForecastService.HOURS && !next.isMissingNode()) {
                hours.add(new Hour(time, temp.asDouble(), temp.asDouble(), rainChance,
                        next.path("details").path("precipitation_amount").asDouble(0), code(symbol),
                        details.path("wind_speed").asDouble(0) * 3.6, isDay(symbol, local.getHour())));
            }
        }
        if (hours.isEmpty()) {
            throw new IllegalArgumentException("Respuesta de MET sin horas");
        }
        Hour first = hours.get(0);
        JsonNode firstDetails = series.get(0).path("data").path("instant").path("details");
        Integer humidity = firstDetails.path("relative_humidity").isNumber()
                ? (int) Math.round(firstDetails.path("relative_humidity").asDouble()) : null;
        Current current = new Current(first.time(), first.temperature(), first.feelsLike(), first.code(), first.isDay(),
                first.rain(), first.wind(), humidity);
        return new Forecast(lat, lon, current, List.copyOf(hours), new Day(max, min, null, null, null, chanceMax, null),
                updatedAt);
    }
}
