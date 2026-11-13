package com.batransit.api.live;

import com.fasterxml.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

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

    /**
     * Un tren de subte andando, ubicado entre la estacion por la que paso y
     * la proxima segun los horarios del pronostico (no hay GPS): por eso es
     * una posicion estimada.
     */
    public record Position(String id, double latitude, double longitude, String destination, String nextStation,
                           Integer minutesToNext) {
    }

    /** Una estacion nuestra de la linea: nombre, ubicacion y orden en la linea (null si no se sabe). */
    public record Place(String name, double latitude, double longitude, Integer order) {
        public Place(String name, double latitude, double longitude) {
            this(name, latitude, longitude, null);
        }
    }

    /** Un tren que espera en la cabecera y sale en menos de esto se muestra en la cabecera. */
    /** Para contar como tren andando, una hora del pronostico entre hace esto y dentro de LINE_AHEAD_SECONDS. */
    static final long LINE_BEHIND_SECONDS = 120;
    static final long LINE_AHEAD_SECONDS = 2 * 3600;

    /**
     * Las lineas (A, B, ... H) con algun tren en el pronostico: un viaje
     * con alguna hora real (no de relleno) cerca de ahora. Una linea que
     * deberia andar y no aparece aca no tiene trenes (paro o corte total).
     */
    public static Set<String> linesWithTrains(JsonNode feed, long nowEpochSeconds) {
        long headerTs = feed.path("Header").path("timestamp").asLong(0);
        Set<String> lines = new TreeSet<>();
        for (JsonNode entity : feed.path("Entity")) {
            JsonNode trip = entity.path("Linea");
            String route = normalize(trip.path("Route_Id").asText(""));
            if (!route.startsWith("linea") || route.length() != "linea".length() + 1) {
                continue;
            }
            for (JsonNode stop : trip.path("Estaciones")) {
                long time = stop.path("arrival").path("time").asLong(0);
                if (!isFiller(time, headerTs) && time >= nowEpochSeconds - LINE_BEHIND_SECONDS
                        && time <= nowEpochSeconds + LINE_AHEAD_SECONDS) {
                    lines.add(route.substring("linea".length()).toUpperCase(Locale.ROOT));
                    break;
                }
            }
        }
        return lines;
    }

    static final long DEPARTING_SECONDS = 60;

    /**
     * Los trenes de la linea que estan andando ahora: cada viaje del
     * pronostico trae la hora en cada estacion; el tren esta entre la ultima
     * por la que ya paso y la proxima, en proporcion al tiempo.
     */
    public static List<Position> positions(JsonNode feed, String lineCode, List<Place> places, long nowEpochSeconds) {
        long headerTs = feed.path("Header").path("timestamp").asLong(0);
        String routeId = "linea" + lineCode.toLowerCase(Locale.ROOT);
        List<Position> result = new ArrayList<>();
        for (JsonNode entity : feed.path("Entity")) {
            JsonNode trip = entity.path("Linea");
            if (!normalize(trip.path("Route_Id").asText("")).equals(routeId)) {
                continue;
            }
            JsonNode stops = trip.path("Estaciones");
            int n = stops.size();
            if (n < 2) {
                continue;
            }
            long[] raw = new long[n];
            for (int i = 0; i < n; i++) {
                raw[i] = stops.get(i).path("arrival").path("time").asLong(0);
            }
            long[] times = new long[n];
            boolean any = false;
            for (int i = 0; i < n; i++) {
                Long t = isFiller(raw[i], headerTs) ? interpolate(raw, i, headerTs) : Long.valueOf(raw[i]);
                if (t == null) {
                    any = false;
                    break;
                }
                times[i] = t;
                any = true;
            }
            if (!any || nowEpochSeconds >= times[n - 1]) {
                continue; // sin datos o ya termino
            }
            String destination = stops.get(n - 1).path("stop_name").asText("");
            String id = entity.path("ID").asText(trip.path("Trip_Id").asText(""));
            if (nowEpochSeconds < times[0]) {
                Place first = place(places, stops.get(0).path("stop_name").asText(""));
                Place second = place(places, stops.get(1).path("stop_name").asText(""));
                Place previous = previous(places, first, second);
                long left = times[0] - nowEpochSeconds;
                if (previous != null && left <= 2 * SECONDS_PER_STATION) {
                    // El pronostico trae solo las que le faltan: viene de la anterior en la linea.
                    double f = Math.max(0, Math.min(1, 1 - (double) left / SECONDS_PER_STATION));
                    result.add(new Position(id,
                            previous.latitude() + (first.latitude() - previous.latitude()) * f,
                            previous.longitude() + (first.longitude() - previous.longitude()) * f,
                            destination, first.name(), (int) (left / 60)));
                } else if (previous == null && first != null && left <= DEPARTING_SECONDS) {
                    // Esta por salir de la cabecera.
                    result.add(new Position(id, first.latitude(), first.longitude(), destination, first.name(),
                            (int) (left / 60)));
                }
                continue;
            }
            int i = 0;
            while (i < n - 2 && times[i + 1] <= nowEpochSeconds) {
                i++;
            }
            Place from = place(places, stops.get(i).path("stop_name").asText(""));
            Place to = place(places, stops.get(i + 1).path("stop_name").asText(""));
            if (from == null || to == null) {
                continue;
            }
            long span = Math.max(1, times[i + 1] - times[i]);
            double f = Math.max(0, Math.min(1, (double) (nowEpochSeconds - times[i]) / span));
            result.add(new Position(id,
                    from.latitude() + (to.latitude() - from.latitude()) * f,
                    from.longitude() + (to.longitude() - from.longitude()) * f,
                    destination, to.name(), (int) Math.max(0, (times[i + 1] - nowEpochSeconds) / 60)));
        }
        return List.copyOf(result);
    }

    /**
     * La estacion de la linea antes de first, en el sentido en que va el tren
     * (de first a second); null si first es la cabecera o no se sabe el orden.
     */
    static Place previous(List<Place> places, Place first, Place second) {
        if (first == null || second == null || first.order() == null || second.order() == null
                || first.order().equals(second.order())) {
            return null;
        }
        int wanted = first.order() + (second.order() > first.order() ? -1 : 1);
        return places.stream().filter(p -> p.order() != null && p.order() == wanted).findFirst().orElse(null);
    }

    /** La estacion nuestra con ese nombre del pronostico (igual, o igual antes del guion). */
    static Place place(List<Place> places, String stopName) {
        String name = normalize(stopName);
        String shortName = beforeDash(name);
        for (Place p : places) {
            String ours = normalize(p.name());
            if (ours.equals(name) || beforeDash(ours).equals(shortName)) {
                return p;
            }
        }
        return null;
    }
}
