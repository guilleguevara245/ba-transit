package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;
import com.batransit.api.colectivos.BusModels.Catalog;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Corrige los sentidos con el destino cambiado. En el feed, algunas lineas
 * tienen el cartel de un sentido en el otro: el 303A dice "a Est. Moron" en
 * el sentido que sale de Moron y va a Pacheco, y "a Colectora Pta. 2 Ford" en
 * el que vuelve. Se nota cuando el cartel nombra una estacion de tren o de
 * subte ("a Est. Moron", "a Constitucion") y el recorrido empieza al lado de
 * esa estacion y termina lejos: ese cartel es el del otro sentido, y se
 * intercambian. Si el otro sentido si termina en la estacion que nombra (los
 * dos carteles dicen lo mismo) no se toca nada.
 */
final class HeadsignCheck {

    /** Una estacion con nombre y ubicacion. */
    record Place(String name, double latitude, double longitude) {
    }

    /** Cerca de la estacion: el recorrido empieza (o termina) ahi. */
    static final double NEAR_KM = 1.5;
    /** Lejos: el recorrido no termina ahi. */
    static final double FAR_KM = 3;

    private HeadsignCheck() {
    }

    /** El catalogo con los carteles de los sentidos cambiados intercambiados; cuantos, en swapped. */
    static Catalog fix(Catalog catalog, List<Place> places, int[] swapped) {
        if (places == null || places.isEmpty()) {
            return catalog;
        }
        Map<String, List<Place>> byName = new LinkedHashMap<>();
        for (Place place : places) {
            String name = normalize(place.name());
            if (name.length() >= 4) {
                byName.computeIfAbsent(name, k -> new ArrayList<>()).add(place);
            }
        }
        Map<String, BusRoute> routes = new LinkedHashMap<>();
        catalog.routes().forEach((id, route) -> {
            List<BusDirection> directions = route.directions();
            if (directions.size() == 2 && shouldSwap(directions.get(0), directions.get(1), byName)) {
                BusDirection a = directions.get(0);
                BusDirection b = directions.get(1);
                route = new BusRoute(route.id(), route.shortName(), route.longName(), route.agency(), route.color(),
                        List.of(new BusDirection(a.directionId(), b.headsign(), a.shape(), a.stops(), a.minutes()),
                                new BusDirection(b.directionId(), a.headsign(), b.shape(), b.stops(), b.minutes())));
                if (swapped != null) {
                    swapped[0]++;
                }
            }
            routes.put(id, route);
        });
        return new Catalog(routes, catalog.loadedAt());
    }

    static boolean shouldSwap(BusDirection a, BusDirection b, Map<String, List<Place>> byName) {
        Ends endsA = ends(a, byName);
        Ends endsB = ends(b, byName);
        boolean someNamesItsStart = endsA == Ends.STARTS_THERE || endsB == Ends.STARTS_THERE;
        boolean someNamesItsEnd = endsA == Ends.ENDS_THERE || endsB == Ends.ENDS_THERE;
        return someNamesItsStart && !someNamesItsEnd;
    }

    enum Ends { STARTS_THERE, ENDS_THERE, UNKNOWN }

    /** Donde queda, respecto del recorrido, la estacion que nombra el cartel como destino. */
    static Ends ends(BusDirection direction, Map<String, List<Place>> byName) {
        List<BusStop> stops = direction.stops();
        List<Place> named = destination(direction.headsign(), byName);
        if (named.isEmpty() || stops.size() < 2) {
            return Ends.UNKNOWN;
        }
        BusStop first = stops.get(0);
        BusStop last = stops.get(stops.size() - 1);
        double start = Double.MAX_VALUE;
        double end = Double.MAX_VALUE;
        for (Place place : named) {
            start = Math.min(start, km(place, first));
            end = Math.min(end, km(place, last));
        }
        if (end <= NEAR_KM) {
            return Ends.ENDS_THERE;
        }
        if (start <= NEAR_KM && end >= FAR_KM) {
            return Ends.STARTS_THERE;
        }
        return Ends.UNKNOWN;
    }

    /**
     * Las estaciones que el cartel nombra como destino: lo que va despues del
     * ultimo "a" o "hasta" y antes de un "x" o "por" (por donde pasa). La de
     * nombre mas largo ("Remedios de Escalada" antes que "Escalada"). "Ramal
     * A" o "Cartel B" no cuentan como "a".
     */
    static List<Place> destination(String headsign, Map<String, List<Place>> byName) {
        if (headsign == null) {
            return List.of();
        }
        // "Ramal A" o "Cartel B" no son "a" de destino.
        String text = " " + normalize(headsign).replaceAll("\\b(ramal|cartel|linea) [a-z0-9]{1,2}\\b", " ") + " ";
        int at = Math.max(text.lastIndexOf(" a "), text.lastIndexOf(" hasta "));
        if (at < 0) {
            return List.of();
        }
        String tail = text.substring(at);
        for (String via : List.of(" x ", " por ")) {
            int cut = tail.indexOf(via, 1);
            if (cut > 0) {
                tail = tail.substring(0, cut + 1);
            }
        }
        String best = null;
        for (String name : byName.keySet()) {
            if (tail.contains(" " + name + " ") && (best == null || name.length() > best.length())) {
                best = name;
            }
        }
        return best == null ? List.of() : byName.get(best);
    }

    /** "Est. Morón" -> "est moron". */
    static String normalize(String text) {
        String plain = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return plain.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
    }

    private static double km(Place place, BusStop stop) {
        double lat = Math.toRadians((place.latitude() + stop.latitude()) / 2);
        double x = Math.toRadians(stop.longitude() - place.longitude()) * Math.cos(lat);
        double y = Math.toRadians(stop.latitude() - place.latitude());
        return Math.sqrt(x * x + y * y) * 6371;
    }
}
