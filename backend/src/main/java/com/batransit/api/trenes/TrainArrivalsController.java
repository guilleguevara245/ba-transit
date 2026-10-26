package com.batransit.api.trenes;

import com.batransit.api.trenes.FerroviasArrivals.Direction;
import com.batransit.api.trenes.FerroviasArrivalsClient.Snapshot;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Proximos trenes en vivo de las lineas de tren que los publican. Por
 * ahora solo el Belgrano Norte (Ferrovias); para el resto responde
 * available=false y el sitio no muestra la tarjeta.
 */
@RestController
@RequestMapping("/api/v1/trenes")
public class TrainArrivalsController {

    public record ArrivalsResponse(boolean available, Instant updatedAt, String source, List<Direction> directions) {
        static ArrivalsResponse unavailable() {
            return new ArrivalsResponse(false, null, null, List.of());
        }
    }

    private final FerroviasArrivalsClient ferrovias;

    public TrainArrivalsController(FerroviasArrivalsClient ferrovias) {
        this.ferrovias = ferrovias;
    }

    /** GET /api/v1/trenes/proximos?linea=BELGRANO_NORTE&estacion=Florida */
    @GetMapping("/proximos")
    public ArrivalsResponse arrivals(@RequestParam("linea") String line, @RequestParam("estacion") String station) {
        if (!FerroviasArrivals.LINE_CODE.equals(line.trim().toUpperCase(Locale.ROOT))) {
            return ArrivalsResponse.unavailable();
        }
        Integer stationId = FerroviasArrivals.stationId(station);
        if (stationId == null) {
            return ArrivalsResponse.unavailable();
        }
        Optional<Snapshot> snapshot = ferrovias.arrivals(stationId);
        return snapshot.map(s -> new ArrivalsResponse(true, s.fetchedAt(), "Ferrovías", s.directions()))
                .orElseGet(ArrivalsResponse::unavailable);
    }
}
