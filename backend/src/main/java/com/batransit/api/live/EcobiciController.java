package com.batransit.api.live;

import com.batransit.api.live.TransporteLiveClient.Fetched;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Estaciones de EcoBici con bicis y anclajes libres, a partir de los
 * feeds GBFS de la API Transporte: stationInformation (nombre, ubicacion,
 * capacidad; cambia poco) y stationStatus (disponibilidad; cambia seguido).
 */
@RestController
@RequestMapping("/api/v1/ecobici")
public class EcobiciController {

    static final Duration INFO_MAX_AGE = Duration.ofHours(6);
    static final Duration STATUS_MAX_AGE = Duration.ofSeconds(60);

    public record Station(String id, String name, String address, double latitude, double longitude,
                          int capacity, int bikes, int docks, boolean renting) {
    }

    public record EcobiciResponse(boolean available, Instant updatedAt, List<Station> stations) {
    }

    private final TransporteLiveClient client;

    public EcobiciController(TransporteLiveClient client) {
        this.client = client;
    }

    @GetMapping
    public EcobiciResponse stations() {
        Optional<Fetched> info = client.get("/ecobici/gbfs/stationInformation", INFO_MAX_AGE);
        Optional<Fetched> status = client.get("/ecobici/gbfs/stationStatus", STATUS_MAX_AGE);
        if (info.isEmpty() || status.isEmpty()) {
            return new EcobiciResponse(false, null, List.of());
        }
        return new EcobiciResponse(true, status.get().fetchedAt(), merge(info.get().body(), status.get().body()));
    }

    static List<Station> merge(JsonNode information, JsonNode status) {
        Map<String, JsonNode> statusById = new HashMap<>();
        for (JsonNode s : status.path("data").path("stations")) {
            statusById.put(s.path("station_id").asText(""), s);
        }
        List<Station> result = new ArrayList<>();
        for (JsonNode i : information.path("data").path("stations")) {
            String id = i.path("station_id").asText("");
            JsonNode s = statusById.get(id);
            double lat = i.path("lat").asDouble(0);
            double lon = i.path("lon").asDouble(0);
            if (s == null || lat == 0 || lon == 0) {
                continue;
            }
            // GBFS: is_renting puede venir como booleano o como 0/1; status "IN_SERVICE" en versiones viejas.
            JsonNode rentingNode = s.path("is_renting");
            boolean renting = rentingNode.isNumber() ? rentingNode.asInt(1) == 1 : rentingNode.asBoolean(true);
            if ("END_OF_LIFE".equals(s.path("status").asText("")) || "PLANNED".equals(s.path("status").asText(""))) {
                renting = false;
            }
            result.add(new Station(id, i.path("name").asText(""), i.path("address").asText(""), lat, lon,
                    i.path("capacity").asInt(0), s.path("num_bikes_available").asInt(0),
                    s.path("num_docks_available").asInt(0), renting));
        }
        return result;
    }
}
