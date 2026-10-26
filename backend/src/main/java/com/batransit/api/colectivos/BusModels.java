package com.batransit.api.colectivos;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Modelo en memoria de las lineas de colectivo, armado a partir del
 * feed GTFS. No se guarda en la base: se reconstruye en cada carga.
 */
public final class BusModels {

    private BusModels() {
    }

    public record BusStop(String id, String name, double latitude, double longitude) {
    }

    /**
     * Un sentido de la linea: recorrido simplificado, paradas en orden y,
     * para cada parada, los minutos desde la primera segun los horarios del
     * feed (null si el feed no trae horarios para ese viaje).
     */
    public record BusDirection(int directionId, String headsign, List<double[]> shape, List<BusStop> stops,
                               List<Integer> minutes) {
    }

    public record BusRoute(String id, String shortName, String longName, String agency, String color,
                           List<BusDirection> directions) {
    }

    public record Catalog(Map<String, BusRoute> routes, Instant loadedAt) {
    }
}
