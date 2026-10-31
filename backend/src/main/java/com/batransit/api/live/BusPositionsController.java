package com.batransit.api.live;

import com.batransit.api.live.TransporteLiveClient.Fetched;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Posicion en vivo de los colectivos de una linea, segun
 * /colectivos/vehiclePositionsSimple de la API Transporte. Cada registro
 * trae route_id (el mismo id de linea del feed GTFS), latitude,
 * longitude, direction, trip_headsign y timestamp.
 */
@RestController
@RequestMapping("/api/v1/colectivos")
public class BusPositionsController {

    /** El feed completo pesa ~1 MB: se pide como mucho cada 20 segundos. */
    static final Duration MAX_AGE = Duration.ofSeconds(20);
    /** Posiciones mas viejas que esto se descartan (colectivo fuera de servicio o sin GPS). */
    static final long MAX_POSITION_AGE_SECONDS = 10 * 60;

    /** otherRoute: de la misma linea (mismo cartel) pero con otro route_id, por ejemplo otro ramal. */
    public record Vehicle(String id, double latitude, double longitude, int direction, String headsign,
                          long ageSeconds, boolean otherRoute) {
    }

    public record VehiclesResponse(boolean available, Instant updatedAt, List<Vehicle> vehicles) {
    }

    /** Version liviana para el mapa general (son ~3000 colectivos): solo lo que se dibuja. */
    public record MovingBus(String id, String routeId, String line, double latitude, double longitude, String headsign,
                            int direction) {
    }

    public record MovingResponse(boolean available, Instant updatedAt, List<MovingBus> buses) {
    }

    /** Cuantos colectivos de cada linea hay en movimiento ahora (para "Mis colectivos" del inicio). */
    public record LineCount(String line, int moving) {
    }

    public record LineCountsResponse(boolean available, Instant updatedAt, List<LineCount> lines) {
    }

    /** Como mucho estas lineas por pedido (las favoritas de una persona). */
    static final int MAX_LINES = 50;

    private final TransporteLiveClient client;

    public BusPositionsController(TransporteLiveClient client) {
        this.client = client;
    }

    /**
     * Todos los colectivos que se estan moviendo ahora (velocidad mayor a
     * cero y posicion reciente), para el mapa de la seccion Colectivos.
     */
    @GetMapping("/vivo")
    public MovingResponse moving() {
        Optional<Fetched> feed = client.get("/colectivos/vehiclePositionsSimple", MAX_AGE);
        if (feed.isEmpty()) {
            return new MovingResponse(false, null, List.of());
        }
        return new MovingResponse(true, feed.get().fetchedAt(),
                movingOf(feed.get().body(), Instant.now().getEpochSecond()));
    }

    static List<MovingBus> movingOf(JsonNode feed, long nowEpochSeconds) {
        List<MovingBus> result = new ArrayList<>();
        for (JsonNode v : feed) {
            double lat = v.path("latitude").asDouble(0);
            double lon = v.path("longitude").asDouble(0);
            long timestamp = v.path("timestamp").asLong(0);
            boolean recent = timestamp <= 0 || nowEpochSeconds - timestamp <= MAX_POSITION_AGE_SECONDS;
            if (lat == 0 || lon == 0 || !recent || v.path("speed").asDouble(0) <= 0) {
                continue;
            }
            // Se redondea a 5 decimales (~1 m): alcanza para el mapa y achica la respuesta.
            result.add(new MovingBus(v.path("id").asText(""), v.path("route_id").asText(""), v.path("route_short_name").asText(""),
                    Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5,
                    com.batransit.api.colectivos.TextRepair.fix(v.path("trip_headsign").asText("")),
                    v.path("direction").asInt(0)));
        }
        return result;
    }

    /**
     * Cuantos colectivos se mueven ahora por linea. lineas: carteles
     * separados por coma ("152,53A"); se compara con route_short_name sin
     * distinguir mayusculas. Mucho mas liviano que /vivo para el inicio.
     */
    @GetMapping("/vivo/lineas")
    public LineCountsResponse movingByLine(@org.springframework.web.bind.annotation.RequestParam(name = "lineas", required = false) String lines) {
        List<String> wanted = parseLines(lines);
        Optional<Fetched> feed = wanted.isEmpty() ? Optional.empty() : client.get("/colectivos/vehiclePositionsSimple", MAX_AGE);
        if (feed.isEmpty()) {
            return new LineCountsResponse(false, null, List.of());
        }
        return new LineCountsResponse(true, feed.get().fetchedAt(),
                countByLine(movingOf(feed.get().body(), Instant.now().getEpochSecond()), wanted));
    }

    static List<String> parseLines(String lines) {
        if (lines == null || lines.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(lines.split(","))
                .map(l -> l.replaceAll("\\s+", "").toUpperCase(java.util.Locale.ROOT))
                .filter(l -> l.matches("[0-9A-Z]{1,8}"))
                .distinct().limit(MAX_LINES).toList();
    }

    static List<LineCount> countByLine(List<MovingBus> moving, List<String> wanted) {
        java.util.Map<String, Integer> counts = new java.util.HashMap<>();
        for (MovingBus bus : moving) {
            counts.merge(bus.line().replaceAll("\\s+", "").toUpperCase(java.util.Locale.ROOT), 1, Integer::sum);
        }
        return wanted.stream().map(l -> new LineCount(l, counts.getOrDefault(l, 0))).toList();
    }

    /**
     * Los colectivos de una linea. numero (opcional): el cartel ("303A");
     * si el feed en vivo trae otro cartel con el mismo route_id (pasa
     * cuando el GTFS del dia y el feed en vivo numeran distinto), se
     * descarta, asi no aparecen colectivos de otra linea en el mapa. Y al
     * reves: los de ese cartel con otro route_id (otro ramal, o un id que
     * el feed en vivo numera distinto) se suman marcados con otherRoute,
     * asi la pagina de la linea cuenta los mismos que "Mis colectivos".
     */
    @GetMapping("/{routeId}/vivo")
    public VehiclesResponse vehicles(@PathVariable String routeId,
                                     @org.springframework.web.bind.annotation.RequestParam(name = "numero", required = false) String line) {
        Optional<Fetched> feed = client.get("/colectivos/vehiclePositionsSimple", MAX_AGE);
        if (feed.isEmpty()) {
            return new VehiclesResponse(false, null, List.of());
        }
        return new VehiclesResponse(true, feed.get().fetchedAt(),
                vehiclesOf(feed.get().body(), routeId, line, Instant.now().getEpochSecond()));
    }

    static List<Vehicle> vehiclesOf(JsonNode feed, String routeId, long nowEpochSeconds) {
        return vehiclesOf(feed, routeId, null, nowEpochSeconds);
    }

    /** "303 a" -> "303A"; null si no hay. */
    static String lineKey(String line) {
        String key = line == null ? "" : line.replaceAll("\\s+", "").toUpperCase(java.util.Locale.ROOT);
        return key.isEmpty() ? null : key;
    }

    static List<Vehicle> vehiclesOf(JsonNode feed, String routeId, String line, long nowEpochSeconds) {
        String wanted = lineKey(line);
        List<Vehicle> result = new ArrayList<>();
        for (JsonNode v : feed) {
            boolean sameRoute = routeId.equals(v.path("route_id").asText(""));
            String vehicleLine = lineKey(v.path("route_short_name").asText(""));
            boolean sameLine = wanted != null && wanted.equals(vehicleLine);
            if (!sameRoute && !sameLine) {
                continue;
            }
            if (sameRoute && wanted != null && vehicleLine != null && !sameLine) {
                continue; // mismo id, otra linea
            }
            double lat = v.path("latitude").asDouble(0);
            double lon = v.path("longitude").asDouble(0);
            if (lat == 0 || lon == 0) {
                continue;
            }
            long timestamp = v.path("timestamp").asLong(0);
            long age = timestamp > 0 ? Math.max(0, nowEpochSeconds - timestamp) : 0;
            if (timestamp > 0 && age > MAX_POSITION_AGE_SECONDS) {
                continue;
            }
            result.add(new Vehicle(v.path("id").asText(""), lat, lon, v.path("direction").asInt(0),
                    com.batransit.api.colectivos.TextRepair.fix(v.path("trip_headsign").asText("")), age, !sameRoute));
        }
        return result;
    }
}
