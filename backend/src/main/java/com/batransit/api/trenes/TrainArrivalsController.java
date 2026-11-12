package com.batransit.api.trenes;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.MapStation;
import com.batransit.api.repository.StationRepository;
import com.batransit.api.trenes.FerroviasArrivals.Direction;
import com.batransit.api.trenes.FerroviasArrivalsClient.Snapshot;
import com.batransit.api.trenes.SofseArrivals.Parsed;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Proximos trenes de las lineas de tren que los publican: el Belgrano
 * Norte (pantalla de Ferrovias) y las de Trenes Argentinos (API de Trenes
 * de Ariel Aguirre). Para el resto (el Urquiza tiene su horario en el
 * sitio) responde available=false y el sitio no muestra la tarjeta.
 * scheduled: los horarios son los programados, sin seguimiento del tren.
 * Los destinos de Trenes Argentinos se muestran con el nombre que tienen en
 * el sitio ("Plaza C." o "Retiro - LSM" son "Plaza Constitución" y "Retiro").
 */
@RestController
@RequestMapping("/api/v1/trenes")
public class TrainArrivalsController {

    static final String SOFSE_SOURCE = "API Trenes Argentinos";
    /** Cuanto se recuerda que estacion de SOFSE es cada una nuestra (si no se encontro, menos). */
    static final Duration MATCH_MAX_AGE = Duration.ofHours(24);
    static final Duration NO_MATCH_MAX_AGE = Duration.ofHours(1);
    /** Cuanto se guardan nuestras estaciones de tren (para no pedirlas a la base en cada consulta). */
    static final Duration STATIONS_MAX_AGE = Duration.ofHours(1);

    public record ArrivalsResponse(boolean available, Instant updatedAt, String source, boolean scheduled,
                                   List<Direction> directions) {
        static ArrivalsResponse unavailable() {
            return new ArrivalsResponse(false, null, null, false, List.of());
        }
    }

    private record Match(Instant at, Integer sofseId) {
    }

    private record OurStations(Instant at, List<MapStation> stations) {
    }

    private final FerroviasArrivalsClient ferrovias;
    private final SofseArrivalsClient sofse;
    private final StationRepository stations;
    private final Map<String, Match> matches = new ConcurrentHashMap<>();
    private volatile OurStations ourStations;

    public TrainArrivalsController(FerroviasArrivalsClient ferrovias, SofseArrivalsClient sofse,
                                   StationRepository stations) {
        this.ferrovias = ferrovias;
        this.sofse = sofse;
        this.stations = stations;
    }

    /** GET /api/v1/trenes/proximos?linea=BELGRANO_NORTE&estacion=Florida */
    @GetMapping("/proximos")
    public ArrivalsResponse arrivals(@RequestParam("linea") String line, @RequestParam("estacion") String station) {
        String code = line.trim().toUpperCase(Locale.ROOT);
        if (FerroviasArrivals.LINE_CODE.equals(code)) {
            Integer stationId = FerroviasArrivals.stationId(station);
            if (stationId == null) {
                return ArrivalsResponse.unavailable();
            }
            Optional<Snapshot> snapshot = ferrovias.arrivals(stationId);
            return snapshot.map(s -> new ArrivalsResponse(true, s.fetchedAt(), "Ferrovías", false, s.directions()))
                    .orElseGet(ArrivalsResponse::unavailable);
        }
        Integer gerencia = SofseArrivals.GERENCIAS.get(code);
        if (gerencia == null) {
            return ArrivalsResponse.unavailable();
        }
        return sofseStation(code, gerencia, station.trim())
                .flatMap(sofse::arrivals)
                .map(s -> {
                    Parsed parsed = withOurNames(code, gerencia, s.parsed());
                    return new ArrivalsResponse(true, s.fetchedAt(), SOFSE_SOURCE, parsed.scheduledOnly(),
                            parsed.directions());
                })
                .orElseGet(ArrivalsResponse::unavailable);
    }

    /**
     * Los destinos con el nombre de nuestra estacion de la linea que esta en
     * el mismo lugar; si no hay ninguna cerca, queda el de SOFSE.
     */
    private Parsed withOurNames(String line, int gerencia, Parsed parsed) {
        List<MapStation> ours = lineStations(line);
        Map<String, String> names = new HashMap<>();
        parsed.destinationIds().forEach((name, id) -> sofse.station(gerencia, id)
                .flatMap(s -> ours.stream()
                        .filter(o -> o.latitude() != null && o.longitude() != null)
                        .map(o -> Map.entry(o, SofseArrivals.meters(s.latitude(), s.longitude(),
                                o.latitude().doubleValue(), o.longitude().doubleValue())))
                        .filter(e -> e.getValue() <= SofseArrivals.MAX_METERS)
                        .min(Comparator.comparingDouble(Map.Entry::getValue)))
                .ifPresent(e -> names.put(name, e.getKey().stationName())));
        return SofseArrivals.renamed(parsed, names);
    }

    /** Nuestras estaciones de una linea de tren (guardadas un rato). */
    private List<MapStation> lineStations(String line) {
        Instant now = Instant.now();
        OurStations cached = ourStations;
        if (cached == null || !cached.at().plus(STATIONS_MAX_AGE).isAfter(now)) {
            cached = new OurStations(now, stations.findMapStationsByMode(TransportMode.TREN));
            ourStations = cached;
        }
        return cached.stations().stream().filter(s -> line.equals(s.lineCode())).toList();
    }

    /** La estacion de SOFSE que corresponde a la nuestra, por ubicacion (y recordada un tiempo). */
    private Optional<Integer> sofseStation(String line, int gerencia, String name) {
        String key = line + "|" + name.toLowerCase(Locale.ROOT);
        Instant now = Instant.now();
        Match cached = matches.get(key);
        if (cached != null) {
            Duration maxAge = cached.sofseId() == null ? NO_MATCH_MAX_AGE : MATCH_MAX_AGE;
            if (cached.at().plus(maxAge).isAfter(now)) {
                return Optional.ofNullable(cached.sofseId());
            }
        }
        Optional<MapStation> ours = lineStations(line).stream()
                .filter(s -> name.equalsIgnoreCase(s.stationName()))
                .findFirst();
        if (ours.isEmpty()) {
            return Optional.empty();
        }
        Optional<Integer> id = sofse.stationId(gerencia, ours.get().latitude().doubleValue(),
                ours.get().longitude().doubleValue());
        matches.put(key, new Match(now, id.orElse(null)));
        return id;
    }
}
