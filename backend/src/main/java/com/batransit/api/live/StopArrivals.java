package com.batransit.api.live;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusStop;
import com.batransit.api.live.BusPositionsController.Vehicle;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Los colectivos que vienen hacia una parada: cada colectivo se ubica sobre
 * el recorrido (el tramo entre dos paradas mas cercano a su posicion) y,
 * si todavia no paso la parada, se calcula cuanto le falta con los minutos
 * entre paradas del horario del feed.
 */
final class StopArrivals {

    /** Mas lejos que esto del recorrido, el colectivo no se tiene en cuenta (desvio, otro ramal o GPS errado). */
    static final double MAX_OFF_ROUTE_METERS = 400;
    /** A menos de esto de la parada (y antes de pasarla) se dice "llegando". */
    static final double ARRIVING_METERS = 120;
    /** Cuantos colectivos se devuelven. */
    static final int MAX_BUSES = 3;

    /**
     * Un colectivo que viene: minutes, lo que le falta segun el horario
     * (null si el feed no trae los minutos de esas paradas); stopsAway,
     * cuantas paradas le faltan (la elegida incluida).
     */
    record Approaching(String id, Integer minutes, int stopsAway, boolean arriving, long ageSeconds) {
    }

    private StopArrivals() {
    }

    /** Los que vienen hacia la parada stopIndex del sentido, del mas cercano al mas lejano. */
    static List<Approaching> approaching(BusDirection direction, int stopIndex, List<Vehicle> vehicles) {
        List<BusStop> stops = direction.stops();
        if (stopIndex < 0 || stopIndex >= stops.size() || stops.size() < 2) {
            return List.of();
        }
        List<Approaching> result = new ArrayList<>();
        for (Vehicle vehicle : vehicles) {
            Position position = locate(stops, vehicle.latitude(), vehicle.longitude());
            if (position == null || position.meters() > MAX_OFF_ROUTE_METERS) {
                continue;
            }
            double progress = position.segment() + position.fraction();
            double metersToStop = meters(vehicle.latitude(), vehicle.longitude(),
                    stops.get(stopIndex).latitude(), stops.get(stopIndex).longitude());
            boolean arriving = progress <= stopIndex && metersToStop <= ARRIVING_METERS;
            if (progress >= stopIndex && !arriving) {
                continue; // ya paso la parada
            }
            int stopsAway = Math.max(1, stopIndex - (int) Math.floor(progress));
            Integer minutes = minutesLeft(direction.minutes(), position, stopIndex, vehicle.ageSeconds());
            result.add(new Approaching(vehicle.id(), arriving ? Integer.valueOf(0) : minutes, arriving ? 0 : stopsAway,
                    arriving, vehicle.ageSeconds()));
        }
        result.sort(Comparator.comparingInt(Approaching::stopsAway)
                .thenComparing(a -> a.minutes() == null ? Integer.MAX_VALUE : a.minutes()));
        return result.size() > MAX_BUSES ? List.copyOf(result.subList(0, MAX_BUSES)) : List.copyOf(result);
    }

    /** El tramo (entre la parada segment y la siguiente) mas cercano, cuanto avanzo en el y a que distancia esta. */
    record Position(int segment, double fraction, double meters) {
    }

    static Position locate(List<BusStop> stops, double lat, double lon) {
        Position best = null;
        for (int i = 0; i < stops.size() - 1; i++) {
            BusStop a = stops.get(i);
            BusStop b = stops.get(i + 1);
            // Proyeccion sobre el tramo en un plano local (alcanza para distancias de cuadras).
            double cos = Math.cos(Math.toRadians(lat));
            double ax = a.longitude() * cos;
            double ay = a.latitude();
            double bx = b.longitude() * cos;
            double by = b.latitude();
            double px = lon * cos;
            double dx = bx - ax;
            double dy = by - ay;
            double length2 = dx * dx + dy * dy;
            double t = length2 == 0 ? 0 : ((px - ax) * dx + (lat - ay) * dy) / length2;
            t = Math.max(0, Math.min(1, t));
            double qLat = ay + t * dy;
            double qLon = (ax + t * dx) / cos;
            double d = meters(lat, lon, qLat, qLon);
            if (best == null || d < best.meters()) {
                best = new Position(i, t, d);
            }
        }
        return best;
    }

    /**
     * Minutos que le faltan: los minutos desde la cabecera hasta la parada
     * menos los del punto donde esta el colectivo (interpolado en su tramo),
     * menos lo que paso desde que mando la posicion.
     */
    static Integer minutesLeft(List<Integer> minutes, Position position, int stopIndex, long ageSeconds) {
        if (minutes == null || stopIndex >= minutes.size() || position.segment() + 1 >= minutes.size()) {
            return null;
        }
        Integer target = minutes.get(stopIndex);
        Integer from = minutes.get(position.segment());
        Integer to = minutes.get(position.segment() + 1);
        if (target == null || from == null || to == null) {
            return null;
        }
        double at = from + position.fraction() * (to - from);
        double left = target - at - ageSeconds / 60.0;
        return (int) Math.max(1, Math.round(left));
    }

    static double meters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
