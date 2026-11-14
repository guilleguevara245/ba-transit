package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;
import com.batransit.api.colectivos.BusModels.Catalog;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Corrige los sentidos con el destino cambiado. En el feed, algunas lineas
 * tienen el cartel de un sentido en el otro: el 303A dice "a Est. Moron" en
 * el sentido que sale de Moron y va a Pacheco, y "a Colectora Pta. 2 Ford" en
 * el que vuelve. Se nota cuando el cartel nombra como destino una estacion
 * de tren ("a Est. Moron", "a Constitucion"; las de subte no, porque se
 * llaman como calles: "Belgrano", "Moreno") y el recorrido empieza
 * al lado de esa estacion y termina lejos, o cuando nombra una calle o un
 * lugar que aparece en las primeras paradas y no en las ultimas ("a Newton y
 * Epecuen" en el sentido que sale de Epecuen): ese cartel es el del otro
 * sentido, y se intercambian. Si el otro sentido si termina donde dice su
 * cartel no se toca nada, y tampoco los carteles con IDA o VUELTA ni las
 * listas con guiones ("a X - Y - Z"), que no dicen un solo destino.
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

    /** Las estaciones por nombre normalizado ("moron"), sin los nombres de menos de 4 letras. */
    static Map<String, List<Place>> index(List<Place> places) {
        Map<String, List<Place>> byName = new LinkedHashMap<>();
        for (Place place : places == null ? List.<Place>of() : places) {
            String name = normalize(place.name());
            if (name.length() >= 4) {
                byName.computeIfAbsent(name, k -> new ArrayList<>()).add(place);
            }
        }
        return byName;
    }

    /** El catalogo con los carteles de los sentidos cambiados intercambiados; los ids de esas lineas, en swapped. */
    static Catalog fix(Catalog catalog, List<Place> places, Collection<String> swapped) {
        if (places == null || places.isEmpty()) {
            return catalog;
        }
        Map<String, List<Place>> byName = index(places);
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
                    swapped.add(id);
                }
            }
            routes.put(id, route);
        });
        return new Catalog(routes, catalog.loadedAt());
    }

    static boolean shouldSwap(BusDirection a, BusDirection b, Map<String, List<Place>> byName) {
        Ends endsA = ends(a, b.headsign(), byName);
        Ends endsB = ends(b, a.headsign(), byName);
        boolean someNamesItsStart = endsA == Ends.STARTS_THERE || endsB == Ends.STARTS_THERE;
        boolean someNamesItsEnd = endsA == Ends.ENDS_THERE || endsB == Ends.ENDS_THERE;
        return someNamesItsStart && !someNamesItsEnd;
    }

    enum Ends { STARTS_THERE, ENDS_THERE, UNKNOWN }

    /**
     * Donde queda, respecto del recorrido, el destino que nombra el cartel:
     * primero por la estacion; si no nombra ninguna, por las calles (salvo que
     * el cartel del otro sentido nombre el mismo lugar: "a Zapiola / Padua" y
     * "a Confiteria Zapiola" no dicen cual es cual).
     */
    static Ends ends(BusDirection direction, String otherHeadsign, Map<String, List<Place>> byName) {
        Ends byStation = byStation(direction, byName);
        if (byStation != Ends.UNKNOWN) {
            return byStation;
        }
        // Del otro cartel, su destino; si no dice uno claro ("a Zapiola / Padua"), todo el cartel.
        String otherDestination = destinationText(otherHeadsign);
        java.util.Set<String> other = new java.util.HashSet<>(placeWords(otherDestination != null ? otherDestination
                : otherHeadsign == null ? "" : normalize(otherHeadsign)));
        return placeWords(destinationText(direction.headsign())).stream().anyMatch(other::contains)
                ? Ends.UNKNOWN : byStreet(direction);
    }

    /** Las palabras de 5 letras o mas que nombran un lugar (sin "avenida", "plaza", numeros). */
    static List<String> placeWords(String text) {
        if (text == null) {
            return List.of();
        }
        return java.util.Arrays.stream(text.trim().split(" "))
                .filter(w -> w.length() >= 5 && !COMMON_WORDS.contains(w) && !w.chars().allMatch(Character::isDigit))
                .toList();
    }

    /** Por la estacion que nombra el cartel: cerca del final, o cerca del inicio y lejos del final. */
    static Ends byStation(BusDirection direction, Map<String, List<Place>> byName) {
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

    /** Palabras que no identifican un lugar ("a Av. Paseo Colon": "paseo" y "colon", no "avenida"). */
    private static final java.util.Set<String> COMMON_WORDS = java.util.Set.of("avenida", "avda", "estacion", "plaza",
            "barrio", "calle", "ruta", "puente", "parada", "terminal", "centro", "general", "presidente", "doctor",
            "santa", "hospital", "interna", "entrada");

    /**
     * Por las calles: las palabras del destino (de 5 letras o mas) en el
     * nombre de alguna de las 4 ultimas paradas (termina ahi) o, si no, de las
     * 2 primeras (empieza ahi). Sin IDA, VUELTA ni guiones en el cartel.
     */
    static Ends byStreet(BusDirection direction) {
        List<BusStop> stops = direction.stops();
        String headsign = direction.headsign();
        String tail = destinationText(headsign);
        if (tail == null || headsign.contains("-") || stops.size() < 6) {
            return Ends.UNKNOWN;
        }
        List<String> words = placeWords(tail);
        if (words.isEmpty()) {
            return Ends.UNKNOWN;
        }
        if (mentions(stops.subList(stops.size() - 4, stops.size()), words)) {
            return Ends.ENDS_THERE;
        }
        return mentions(stops.subList(0, 2), words) ? Ends.STARTS_THERE : Ends.UNKNOWN;
    }

    private static boolean mentions(List<BusStop> stops, List<String> words) {
        for (BusStop stop : stops) {
            String name = " " + normalize(stop.name()) + " ";
            for (String word : words) {
                if (name.contains(" " + word + " ")) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * El destino del cartel, normalizado y entre espacios: lo que va despues
     * del ultimo "a" o "hasta" y antes de un "x" o "por". Null si el cartel no
     * dice un destino: si dice IDA o VUELTA, o si despues del "a" hay una
     * lista con guiones o barras ("a Est. Merlo - x Libertad - Lasalle").
     */
    static String destinationText(String headsign) {
        if (headsign == null) {
            return null;
        }
        String plain = normalize(headsign);
        if (plain.matches(".*\\b(ida|vuelta)\\b.*")) {
            return null;
        }
        String original = " " + headsign.toLowerCase(java.util.Locale.ROOT)
                .replaceAll("\\b(ramal|cartel|linea|línea) [a-z0-9]{1,2}\\b", " ") + " ";
        int from = Math.max(original.lastIndexOf(" a "), original.lastIndexOf(" hasta "));
        if (from >= 0) {
            String rest = original.substring(from);
            for (String via : List.of(" x ", " por ")) {
                int cut = rest.indexOf(via, 1);
                if (cut > 0) {
                    rest = rest.substring(0, cut);
                }
            }
            if (rest.contains("-") || rest.contains("/")) {
                return null;
            }
        }
        // "Ramal A" o "Cartel B" no son "a" de destino.
        String text = " " + plain.replaceAll("\\b(ramal|cartel|linea) [a-z0-9]{1,2}\\b", " ") + " ";
        int at = Math.max(text.lastIndexOf(" a "), text.lastIndexOf(" hasta "));
        if (at < 0) {
            return null;
        }
        String tail = text.substring(at);
        for (String via : List.of(" x ", " por ")) {
            int cut = tail.indexOf(via, 1);
            if (cut > 0) {
                tail = tail.substring(0, cut + 1);
            }
        }
        return tail;
    }

    /**
     * Las estaciones que el cartel nombra como destino: lo que va despues del
     * ultimo "a" o "hasta" y antes de un "x" o "por" (por donde pasa). La de
     * nombre mas largo ("Remedios de Escalada" antes que "Escalada"). "Ramal
     * A" o "Cartel B" no cuentan como "a".
     */
    static List<Place> destination(String headsign, Map<String, List<Place>> byName) {
        String tail = destinationText(headsign);
        if (tail == null) {
            return List.of();
        }
        String best = destinationName(tail, byName);
        return best == null ? List.of() : byName.get(best);
    }

    private static String destinationName(String tail, Map<String, List<Place>> byName) {
        String best = null;
        for (String name : byName.keySet()) {
            if (tail.contains(" " + name + " ") && (best == null || name.length() > best.length())) {
                best = name;
            }
        }
        return best;
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
