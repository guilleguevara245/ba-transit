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

    /**
     * Mas lejos que esto de la linea entre paradas, el colectivo no se tiene
     * en cuenta (desvio, otro ramal o GPS errado). Solo si el sentido no
     * trae el recorrido dibujado: entre parada y parada la calle dobla.
     */
    static final double MAX_OFF_ROUTE_METERS = 400;
    /**
     * Mas lejos que esto del recorrido dibujado (GPS y recorte del dibujo
     * incluidos), no esta en el recorrido: por ejemplo, los que esperan en
     * la terminal o el garage a unas cuadras, que si no se ubicaban en el
     * tramo mas cercano y quedaban "a 1 parada" sin moverse.
     */
    static final double MAX_OFF_SHAPE_METERS = 80;
    /** A menos de esto de la parada (y antes de pasarla) se dice "llegando". */
    static final double ARRIVING_METERS = 120;
    /** Cuantos colectivos se devuelven. */
    static final int MAX_BUSES = 3;

    /**
     * Un colectivo que viene: minutes, lo que le falta segun el horario
     * (null si el feed no trae los minutos de esas paradas); stopsAway,
     * cuantas paradas le faltan (la elegida incluida); line, el cartel (solo
     * si la parada junta varios).
     */
    record Approaching(String id, Integer minutes, int stopsAway, boolean arriving, long ageSeconds, String line) {

        Approaching(String id, Integer minutes, int stopsAway, boolean arriving, long ageSeconds) {
            this(id, minutes, stopsAway, arriving, ageSeconds, null);
        }

        /** El mismo, con el cartel de la linea ("42B"). */
        Approaching withLine(String sign) {
            return new Approaching(id, minutes, stopsAway, arriving, ageSeconds, sign);
        }
    }

    /**
     * Los de varios carteles juntos, del que llega primero al ultimo: los que
     * estan llegando, despues por minutos (sin minutos, al final) y por
     * paradas; un mismo colectivo una sola vez.
     */
    static List<Approaching> merge(List<Approaching> buses) {
        java.util.Map<String, Approaching> byId = new java.util.LinkedHashMap<>();
        buses.stream()
                .sorted(Comparator.comparing((Approaching a) -> !a.arriving())
                        .thenComparing(a -> a.minutes() == null ? Integer.MAX_VALUE : a.minutes())
                        .thenComparingInt(Approaching::stopsAway))
                .forEach(a -> byId.putIfAbsent(a.id(), a));
        List<Approaching> sorted = List.copyOf(byId.values());
        return sorted.size() > MAX_BUSES ? List.copyOf(sorted.subList(0, MAX_BUSES)) : sorted;
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
        List<double[]> shape = direction.shape() == null ? List.of() : direction.shape();
        for (Vehicle vehicle : vehicles) {
            if (shape.size() >= 2 && metersToShape(shape, vehicle.latitude(), vehicle.longitude()) > MAX_OFF_SHAPE_METERS) {
                continue;
            }
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
            double[] near = project(a.latitude(), a.longitude(), b.latitude(), b.longitude(), lat, lon);
            if (best == null || near[1] < best.meters()) {
                best = new Position(i, near[0], near[1]);
            }
        }
        return best;
    }

    /** Distancia al recorrido dibujado (puntos {lat, lon} en orden). */
    static double metersToShape(List<double[]> shape, double lat, double lon) {
        double best = Double.MAX_VALUE;
        for (int i = 0; i < shape.size() - 1; i++) {
            double[] a = shape.get(i);
            double[] b = shape.get(i + 1);
            best = Math.min(best, project(a[0], a[1], b[0], b[1], lat, lon)[1]);
        }
        return best;
    }

    /**
     * El punto del tramo a-b mas cercano a (lat, lon): {cuanto avanzo en el
     * tramo (0 a 1), distancia en metros}. Proyeccion en un plano local
     * (alcanza para distancias de cuadras).
     */
    private static double[] project(double aLat, double aLon, double bLat, double bLon, double lat, double lon) {
        double cos = Math.cos(Math.toRadians(lat));
        double ax = aLon * cos;
        double bx = bLon * cos;
        double px = lon * cos;
        double dx = bx - ax;
        double dy = bLat - aLat;
        double length2 = dx * dx + dy * dy;
        double t = length2 == 0 ? 0 : ((px - ax) * dx + (lat - aLat) * dy) / length2;
        t = Math.max(0, Math.min(1, t));
        double qLat = aLat + t * dy;
        double qLon = (ax + t * dx) / cos;
        return new double[] {t, meters(lat, lon, qLat, qLon)};
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
