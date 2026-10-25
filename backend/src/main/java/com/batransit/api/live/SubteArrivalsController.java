package com.batransit.api.live;

import com.batransit.api.live.SubteArrivals.Direction;
import com.batransit.api.live.TransporteLiveClient.Fetched;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/subte")
public class SubteArrivalsController {

    /** El pronostico se renueva cada pocos segundos; 30 s alcanza y cuida el cupo de la API. */
    static final Duration MAX_AGE = Duration.ofSeconds(30);

    public record ArrivalsResponse(boolean available, Instant updatedAt, List<Direction> directions) {
    }

    private final TransporteLiveClient client;

    public SubteArrivalsController(TransporteLiveClient client) {
        this.client = client;
    }

    /** GET /api/v1/subte/proximos?linea=D&estacion=Bulnes */
    @GetMapping("/proximos")
    public ArrivalsResponse arrivals(@RequestParam("linea") String line, @RequestParam("estacion") String station) {
        Optional<Fetched> feed = client.get("/subtes/forecastGTFS", MAX_AGE);
        if (feed.isEmpty()) {
            return new ArrivalsResponse(false, null, List.of());
        }
        List<Direction> directions = SubteArrivals.compute(feed.get().body(), line.trim(), station,
                Instant.now().getEpochSecond());
        return new ArrivalsResponse(true, feed.get().fetchedAt(), directions);
    }
}
