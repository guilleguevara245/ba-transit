package com.batransit.api.live;

import com.fasterxml.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * Calcula los proximos trenes de una estacion a partir del pronostico
 * de la API Transporte (/subtes/forecastGTFS):
 *
 *   { "Header": { "timestamp": ... },
 *     "Entity": [ { "Linea": { "Route_Id": "LineaD", "Direction_ID": 1,
 *         "Estaciones": [ { "stop_name": "Bulnes", "arrival": { "time": ... } }, ... ] } } ] }
 *
 * La API rellena las paradas sin pronostico con arrival.time = 0 o con la
 * hora del encabezado; en ese caso se interpola entre las paradas vecinas
 * con dato real (y el resultado se marca como estimado).
 */
public final class SubteArrivals {

    /** Tiempo medio entre estaciones, para extrapolar cuando hay dato de un solo lado. */
    static final long SECONDS_PER_STATION = 110;
    static final int MAX_PER_DIRECTION = 3;

    private SubteArrivals() {
    }

    public record Arrival(int minutes, boolean estimated) {
    }

    public record Direction(int directionId, String towards, List<Arrival> arrivals) {
    }

    public static List<Direction> compute(JsonNode feed, String lineCode, String stationName, long nowEpochSeconds) {
        long headerTs = feed.path("Header").path("timestamp").asLong(0);
        String routeId = "linea" + lineCode.toLowerCase(Locale.ROOT);
        String station = normalize(stationName);

        Map<Integer, List<Arrival>> byDirection = new TreeMap<>();
        Map<Integer, String> towards = new TreeMap<>();

        for (JsonNode entity : feed.path("Entity")) {
            JsonNode trip = entity.path("Linea");
            if (!normalize(trip.path("Route_Id").asText("")).equals(routeId)) {
                continue;
            }
            JsonNode stops = trip.path("Estaciones");
            int index = indexOfStation(stops, station);
            if (index < 0) {
                continue;
            }
            long[] times = new long[stops.size()];
            for (int i = 0; i < stops.size(); i++) {
                times[i] = stops.get(i).path("arrival").path("time").asLong(0);
            }
            boolean estimated = isFiller(times[index], headerTs);
            Long arrival = estimated ? interpolate(times, index, headerTs) : Long.valueOf(times[index]);
            if (arrival == null) {
                continue;
            }
            long seconds = arrival - nowEpochSeconds;
            if (seconds < 0) {
                continue;
            }
            int direction = trip.path("Direction_ID").asInt(0);
            byDirection.computeIfAbsent(direction, d -> new ArrayList<>())
                    .add(new Arrival((int) (seconds / 60), estimated));
            towards.putIfAbsent(direction, stops.get(stops.size() - 1).path("stop_name").asText(""));
        }

        List<Direction> result = new ArrayList<>();
        byDirection.forEach((direction, arrivals) -> {
            arrivals.sort(Comparator.comparingInt(Arrival::minutes));
            result.add(new Direction(direction, towards.get(direction),
                    List.copyOf(arrivals.subList(0, Math.min(MAX_PER_DIRECTION, arrivals.size())))));
        });
        return result;
    }

    static boolean isFiller(long arrival, long headerTs) {
        return arrival == 0 || Math.abs(arrival - headerTs) <= 1;
    }

    /** Interpola entre las paradas vecinas con dato real; null si el viaje no tiene ninguno. */
    static Long interpolate(long[] t, int k, long headerTs) {
        int before = -1;
        for (int i = k - 1; i >= 0; i--) {
            if (!isFiller(t[i], headerTs)) {
                before = i;
                break;
            }
        }
        int after = -1;
        for (int j = k + 1; j < t.length; j++) {
            if (!isFiller(t[j], headerTs)) {
                after = j;
                break;
            }
        }
        if (before >= 0 && after >= 0) {
            return t[before] + (t[after] - t[before]) * (k - before) / (after - before);
        }
        if (before >= 0) {
            return t[before] + (k - before) * SECONDS_PER_STATION;
        }
        if (after >= 0) {
            return t[after] - (after - k) * SECONDS_PER_STATION;
        }
        return null;
    }

    /**
     * Busca la estacion por nombre: igual, o igual a la parte antes del
     * " - " (en la base "Pasteur", en la API "Pasteur - AMIA", o al reves).
     */
    static int indexOfStation(JsonNode stops, String normalizedStation) {
        String shortStation = beforeDash(normalizedStation);
        for (int i = 0; i < stops.size(); i++) {
            String name = normalize(stops.get(i).path("stop_name").asText(""));
            if (name.equals(normalizedStation) || beforeDash(name).equals(shortStation)) {
                return i;
            }
        }
        return -1;
    }

    private static String beforeDash(String name) {
        int dash = name.indexOf(" - ");
        return dash < 0 ? name : name.substring(0, dash).trim();
    }

    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
