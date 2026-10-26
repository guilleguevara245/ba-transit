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

    public record Vehicle(String id, double latitude, double longitude, int direction, String headsign,
                          long ageSeconds) {
    }

    public record VehiclesResponse(boolean available, Instant updatedAt, List<Vehicle> vehicles) {
    }

    /** Version liviana para el mapa general (son ~3000 colectivos): solo lo que se dibuja. */
    public record MovingBus(String id, String routeId, String line, double latitude, double longitude, String headsign,
                            int direction) {
    }

    public record MovingResponse(boolean available, Instant updatedAt, List<MovingBus> buses) {
    }

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
                    Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, v.path("trip_headsign").asText(""),
                    v.path("direction").asInt(0)));
        }
        return result;
    }

    @GetMapping("/{routeId}/vivo")
    public VehiclesResponse vehicles(@PathVariable String routeId) {
        Optional<Fetched> feed = client.get("/colectivos/vehiclePositionsSimple", MAX_AGE);
        if (feed.isEmpty()) {
            return new VehiclesResponse(false, null, List.of());
        }
        return new VehiclesResponse(true, feed.get().fetchedAt(),
                vehiclesOf(feed.get().body(), routeId, Instant.now().getEpochSecond()));
    }

    static List<Vehicle> vehiclesOf(JsonNode feed, String routeId, long nowEpochSeconds) {
        List<Vehicle> result = new ArrayList<>();
        for (JsonNode v : feed) {
            if (!routeId.equals(v.path("route_id").asText(""))) {
                continue;
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
                    v.path("trip_headsign").asText(""), age));
        }
        return result;
    }
}
