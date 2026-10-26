package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;
import com.batransit.api.colectivos.BusModels.Catalog;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * Convierte un feed GTFS (zip) de colectivos en el modelo en memoria.
 *
 * Para no quedarse sin memoria con el feed del AMBA, no se cargan todos
 * los viajes: por cada linea y sentido se toman unos pocos viajes
 * candidatos y se elige el que tiene mas paradas. Despues se leen solo
 * las paradas, recorridos (shapes) y horarios de esos viajes.
 */
public class GtfsColectivosParser {

    /** Viajes candidatos por linea y sentido. */
    static final int CANDIDATES_PER_DIRECTION = 3;
    /** Puntos maximos del recorrido dibujado por sentido. */
    static final int MAX_SHAPE_POINTS = 400;

    private record TripInfo(String routeId, int directionId, String shapeId, String headsign) {
    }

    public Catalog parse(Path zipPath) throws IOException {
        try (ZipFile zip = new ZipFile(zipPath.toFile())) {
            Map<String, String> agencies = readAgencies(zip);

            // 1. Lineas
            Map<String, String[]> routes = new LinkedHashMap<>();
            read(zip, "routes.txt", row -> routes.put(row.get("route_id"), new String[] {
                    row.get("route_short_name"), row.get("route_long_name"),
                    agencies.getOrDefault(row.get("agency_id"), agencies.size() == 1 ? agencies.values().iterator().next() : ""),
                    row.get("route_color")}));

            // 2. Viajes candidatos por (linea, sentido)
            Map<String, TripInfo> candidates = new HashMap<>();
            Map<String, List<String>> candidatesByKey = new HashMap<>();
            read(zip, "trips.txt", row -> {
                String routeId = row.get("route_id");
                if (!routes.containsKey(routeId)) {
                    return;
                }
                int direction = parseIntOr(row.get("direction_id"), 0);
                String key = routeId + "|" + direction;
                List<String> list = candidatesByKey.computeIfAbsent(key, k -> new ArrayList<>());
                String shapeId = row.get("shape_id");
                boolean repeatedShape = !shapeId.isEmpty() && list.stream()
                        .anyMatch(t -> shapeId.equals(candidates.get(t).shapeId()));
                if (list.size() < CANDIDATES_PER_DIRECTION && !repeatedShape) {
                    String tripId = row.get("trip_id");
                    list.add(tripId);
                    candidates.put(tripId, new TripInfo(routeId, direction, shapeId, row.get("trip_headsign")));
                }
            });

            // 3. Paradas (y horarios) de los viajes candidatos
            Map<String, TreeMap<Integer, String>> stopsByTrip = new HashMap<>();
            Map<String, Map<Integer, Integer>> secondsByTrip = new HashMap<>();
            read(zip, "stop_times.txt", row -> {
                String tripId = row.get("trip_id");
                if (candidates.containsKey(tripId)) {
                    int sequence = parseIntOr(row.get("stop_sequence"), 0);
                    stopsByTrip.computeIfAbsent(tripId, k -> new TreeMap<>()).put(sequence, row.get("stop_id"));
                    Integer seconds = parseTime(row.get("arrival_time"));
                    if (seconds == null) {
                        seconds = parseTime(row.get("departure_time"));
                    }
                    if (seconds != null) {
                        secondsByTrip.computeIfAbsent(tripId, k -> new HashMap<>()).put(sequence, seconds);
                    }
                }
            });

            // 4. Elegir, por linea y sentido, el candidato con mas paradas
            Map<String, String> chosenByKey = new HashMap<>();
            candidatesByKey.forEach((key, trips) -> trips.stream()
                    .max(Comparator.comparingInt(t -> stopsByTrip.getOrDefault(t, new TreeMap<>()).size()))
                    .ifPresent(t -> chosenByKey.put(key, t)));

            Set<String> neededStops = new HashSet<>();
            Set<String> neededShapes = new HashSet<>();
            for (String tripId : chosenByKey.values()) {
                neededStops.addAll(stopsByTrip.getOrDefault(tripId, new TreeMap<>()).values());
                String shapeId = candidates.get(tripId).shapeId();
                if (!shapeId.isEmpty()) {
                    neededShapes.add(shapeId);
                }
            }

            // 5. Datos de las paradas y recorridos necesarios
            Map<String, BusStop> stops = new HashMap<>();
            read(zip, "stops.txt", row -> {
                String id = row.get("stop_id");
                if (neededStops.contains(id)) {
                    stops.put(id, new BusStop(id, row.get("stop_name"),
                            parseDoubleOr(row.get("stop_lat")), parseDoubleOr(row.get("stop_lon"))));
                }
            });

            Map<String, TreeMap<Integer, double[]>> shapes = new HashMap<>();
            if (zip.getEntry("shapes.txt") != null) {
                read(zip, "shapes.txt", row -> {
                    String id = row.get("shape_id");
                    if (neededShapes.contains(id)) {
                        shapes.computeIfAbsent(id, k -> new TreeMap<>()).put(
                                parseIntOr(row.get("shape_pt_sequence"), 0),
                                new double[] {parseDoubleOr(row.get("shape_pt_lat")), parseDoubleOr(row.get("shape_pt_lon"))});
                    }
                });
            }

            // 6. Armar el modelo
            Map<String, BusRoute> result = new LinkedHashMap<>();
            routes.forEach((routeId, r) -> {
                List<BusDirection> directions = new ArrayList<>();
                for (int direction = 0; direction <= 1; direction++) {
                    String tripId = chosenByKey.get(routeId + "|" + direction);
                    if (tripId == null) {
                        continue;
                    }
                    TripInfo trip = candidates.get(tripId);
                    List<BusStop> tripStops = new ArrayList<>();
                    List<Integer> tripSeconds = new ArrayList<>();
                    Map<Integer, Integer> seconds = secondsByTrip.getOrDefault(tripId, Map.of());
                    stopsByTrip.getOrDefault(tripId, new TreeMap<>()).forEach((sequence, stopId) -> {
                        BusStop stop = stops.get(stopId);
                        if (stop != null) {
                            tripStops.add(stop);
                            tripSeconds.add(seconds.get(sequence));
                        }
                    });
                    List<double[]> shape = shapes.containsKey(trip.shapeId())
                            ? simplify(new ArrayList<>(shapes.get(trip.shapeId()).values()))
                            : tripStops.stream().map(s -> new double[] {s.latitude(), s.longitude()}).toList();
                    String headsign = trip.headsign().isEmpty() && !tripStops.isEmpty()
                            ? tripStops.get(tripStops.size() - 1).name()
                            : trip.headsign();
                    directions.add(new BusDirection(direction, headsign, shape, List.copyOf(tripStops),
                            minutesFromStart(tripSeconds)));
                }
                result.put(routeId, new BusRoute(routeId, r[0], r[1], r[2], normalizeColor(r[3]), directions));
            });

            return new Catalog(result, Instant.now());
        }
    }

    private Map<String, String> readAgencies(ZipFile zip) throws IOException {
        Map<String, String> agencies = new HashMap<>();
        if (zip.getEntry("agency.txt") != null) {
            read(zip, "agency.txt", row -> agencies.put(row.get("agency_id"), row.get("agency_name")));
        }
        return agencies;
    }

    private static void read(ZipFile zip, String name, java.util.function.Consumer<GtfsCsv.Row> consumer)
            throws IOException {
        ZipEntry entry = zip.getEntry(name);
        if (entry == null) {
            throw new IOException("El feed GTFS no tiene " + name);
        }
        try (InputStream input = zip.getInputStream(entry)) {
            GtfsCsv.forEachRow(input, consumer);
        }
    }

    /** "08:05:30" -> 29130 segundos. Admite horas mayores a 23 (viajes despues de medianoche). */
    static Integer parseTime(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String[] parts = text.trim().split(":");
        if (parts.length != 3) {
            return null;
        }
        try {
            return Integer.parseInt(parts[0]) * 3600 + Integer.parseInt(parts[1]) * 60 + Integer.parseInt(parts[2]);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Minutos desde la primera parada. Las paradas sin horario (el feed solo
     * trae algunos puntos de control) se interpolan entre las vecinas que si
     * lo tienen. null si el viaje no tiene al menos dos horarios.
     */
    static List<Integer> minutesFromStart(List<Integer> seconds) {
        List<Integer> known = new ArrayList<>();
        for (int i = 0; i < seconds.size(); i++) {
            if (seconds.get(i) != null) {
                known.add(i);
            }
        }
        if (known.size() < 2) {
            return null;
        }
        int first = known.get(0);
        int last = known.get(known.size() - 1);
        double[] filled = new double[seconds.size()];
        for (int k = 0; k < known.size() - 1; k++) {
            int a = known.get(k);
            int b = known.get(k + 1);
            for (int i = a; i <= b; i++) {
                filled[i] = seconds.get(a) + (seconds.get(b) - seconds.get(a)) * (double) (i - a) / (b - a);
            }
        }
        List<Integer> result = new ArrayList<>(seconds.size());
        for (int i = 0; i < seconds.size(); i++) {
            // Antes del primer horario o despues del ultimo no se puede estimar.
            result.add(i < first || i > last ? null : (int) Math.round((filled[i] - seconds.get(first)) / 60));
        }
        return result;
    }

    /** Se queda con como mucho MAX_SHAPE_POINTS puntos, conservando el primero y el ultimo. */
    static List<double[]> simplify(List<double[]> points) {
        if (points.size() <= MAX_SHAPE_POINTS) {
            return points;
        }
        double step = (points.size() - 1) / (double) (MAX_SHAPE_POINTS - 1);
        List<double[]> result = new ArrayList<>(MAX_SHAPE_POINTS);
        for (int i = 0; i < MAX_SHAPE_POINTS; i++) {
            result.add(points.get((int) Math.round(i * step)));
        }
        return result;
    }

    static String normalizeColor(String color) {
        if (color == null || !color.matches("[0-9A-Fa-f]{6}")) {
            return null;
        }
        return "#" + color.toUpperCase();
    }

    private static int parseIntOr(String value, int fallback) {
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static double parseDoubleOr(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
