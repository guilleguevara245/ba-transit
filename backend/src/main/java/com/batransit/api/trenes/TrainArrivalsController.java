package com.batransit.api.trenes;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.MapStation;
import com.batransit.api.repository.StationRepository;
import com.batransit.api.trenes.FerroviasArrivals.Direction;
import com.batransit.api.trenes.FerroviasArrivalsClient.Snapshot;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
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
 */
@RestController
@RequestMapping("/api/v1/trenes")
public class TrainArrivalsController {

    static final String SOFSE_SOURCE = "API Trenes Argentinos";
    /** Cuanto se recuerda que estacion de SOFSE es cada una nuestra (si no se encontro, menos). */
    static final Duration MATCH_MAX_AGE = Duration.ofHours(24);
    static final Duration NO_MATCH_MAX_AGE = Duration.ofHours(1);

    public record ArrivalsResponse(boolean available, Instant updatedAt, String source, boolean scheduled,
                                   List<Direction> directions) {
        static ArrivalsResponse unavailable() {
            return new ArrivalsResponse(false, null, null, false, List.of());
        }
    }

    private record Match(Instant at, Integer sofseId) {
    }

    private final FerroviasArrivalsClient ferrovias;
    private final SofseArrivalsClient sofse;
    private final StationRepository stations;
    private final Map<String, Match> matches = new ConcurrentHashMap<>();

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
                .map(s -> new ArrivalsResponse(true, s.fetchedAt(), SOFSE_SOURCE, s.parsed().scheduledOnly(),
                        s.parsed().directions()))
                .orElseGet(ArrivalsResponse::unavailable);
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
        Optional<MapStation> ours = stations.findMapStationsByMode(TransportMode.TREN).stream()
                .filter(s -> line.equals(s.lineCode()) && name.equalsIgnoreCase(s.stationName()))
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
