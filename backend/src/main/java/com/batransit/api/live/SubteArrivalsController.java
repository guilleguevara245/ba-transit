package com.batransit.api.live;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.MapStation;
import com.batransit.api.live.SubteArrivals.Direction;
import com.batransit.api.live.SubteArrivals.Place;
import com.batransit.api.live.SubteArrivals.Position;
import com.batransit.api.live.TransporteLiveClient.Fetched;
import com.batransit.api.repository.StationRepository;
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

    /** Proximas pasadas segun el horario programado (GTFS), para cuando no hay datos en vivo. */
    public record ScheduleResponse(boolean available, List<SubteSchedule.Direction> directions) {
    }

    /**
     * Los trenes andando de una linea, para el mapa. estimated: la posicion
     * sale de los horarios del pronostico, no de un GPS.
     */
    public record LiveResponse(boolean available, Instant updatedAt, boolean estimated, List<Position> trains) {
    }

    /** Cuanto se guardan nuestras estaciones de subte y Premetro (para no pedirlas a la base cada vez). */
    static final Duration STATIONS_MAX_AGE = Duration.ofHours(1);

    private record OurStations(Instant at, List<MapStation> stations) {
    }

    private final TransporteLiveClient client;
    private final SubteScheduleService schedule;
    private final StationRepository stations;
    private volatile OurStations ourStations;

    public SubteArrivalsController(TransporteLiveClient client, SubteScheduleService schedule,
                                   StationRepository stations) {
        this.client = client;
        this.schedule = schedule;
        this.stations = stations;
    }

    /** GET /api/v1/subte/en-vivo?linea=D: los trenes andando, con su posicion estimada. */
    @GetMapping("/en-vivo")
    public LiveResponse live(@RequestParam("linea") String line) {
        String code = line.trim().toUpperCase(java.util.Locale.ROOT);
        Optional<Fetched> feed = client.get("/subtes/forecastGTFS", MAX_AGE);
        if (feed.isEmpty()) {
            return new LiveResponse(false, null, true, List.of());
        }
        List<Place> places = lineStations(code).stream()
                .filter(s -> s.latitude() != null && s.longitude() != null)
                .map(s -> new Place(s.stationName(), s.latitude().doubleValue(), s.longitude().doubleValue(),
                        s.sequenceOrder()))
                .toList();
        List<Position> trains = SubteArrivals.positions(feed.get().body(), code, places, Instant.now().getEpochSecond());
        return new LiveResponse(true, feed.get().fetchedAt(), true, trains);
    }

    private List<MapStation> lineStations(String code) {
        Instant now = Instant.now();
        OurStations cached = ourStations;
        if (cached == null || !cached.at().plus(STATIONS_MAX_AGE).isAfter(now)) {
            List<MapStation> all = new java.util.ArrayList<>(stations.findMapStationsByMode(TransportMode.SUBTE));
            all.addAll(stations.findMapStationsByMode(TransportMode.PREMETRO));
            cached = new OurStations(now, List.copyOf(all));
            ourStations = cached;
        }
        return cached.stations().stream().filter(s -> code.equals(s.lineCode())).toList();
    }

    /** GET /api/v1/subte/horario?linea=D&estacion=Bulnes (tambien premetro: linea=P). */
    @GetMapping("/horario")
    public ScheduleResponse schedule(@RequestParam("linea") String line, @RequestParam("estacion") String station) {
        if (!schedule.isAvailable()) {
            return new ScheduleResponse(false, List.of());
        }
        return new ScheduleResponse(true, schedule.nextArrivals(line, station));
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
