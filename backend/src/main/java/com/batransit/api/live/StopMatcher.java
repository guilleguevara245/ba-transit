package com.batransit.api.live;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;

import java.util.List;
import java.util.Optional;

/**
 * Donde para otra linea en la misma parada que una elegida. En el GTFS cada
 * linea puede tener su propio codigo para la misma esquina (la 303 y la 163
 * en Vergara): vale la misma parada o la mas cercana a menos de
 * NEAR_METERS que vaya para el mismo lado (asi no se toma la de enfrente,
 * que va al reves).
 */
final class StopMatcher {

    /** Paradas de distintas lineas en la misma cuadra (antes o despues de la esquina). */
    static final double NEAR_METERS = 80;

    record Match(BusDirection direction, int stopIndex) {
    }

    private StopMatcher() {
    }

    static Optional<Match> find(BusRoute other, BusDirection own, int ownIndex) {
        BusStop target = own.stops().get(ownIndex);
        double[] heading = heading(own.stops(), ownIndex);
        Match best = null;
        double bestMeters = Double.MAX_VALUE;
        for (BusDirection d : other.directions()) {
            List<BusStop> stops = d.stops();
            for (int i = 0; i < stops.size(); i++) {
                BusStop s = stops.get(i);
                if (s.id().equals(target.id())) {
                    return Optional.of(new Match(d, i));
                }
                double meters = StopArrivals.meters(target.latitude(), target.longitude(), s.latitude(), s.longitude());
                if (meters <= NEAR_METERS && meters < bestMeters && sameWay(heading, heading(stops, i))) {
                    best = new Match(d, i);
                    bestMeters = meters;
                }
            }
        }
        return Optional.ofNullable(best);
    }

    /** Para donde va el recorrido en esa parada: de la anterior a la siguiente, en un plano local. */
    static double[] heading(List<BusStop> stops, int index) {
        BusStop from = stops.get(Math.max(0, index - 1));
        BusStop to = stops.get(Math.min(stops.size() - 1, index + 1));
        double cos = Math.cos(Math.toRadians(from.latitude()));
        return new double[] {(to.longitude() - from.longitude()) * cos, to.latitude() - from.latitude()};
    }

    /** Si dos rumbos van para el mismo lado (menos de 90 grados entre ellos). */
    static boolean sameWay(double[] a, double[] b) {
        return a[0] * b[0] + a[1] * b[1] > 0;
    }
}
