package com.batransit.api.trenes;

import com.batransit.api.trenes.FerroviasArrivals.Arrival;
import com.batransit.api.trenes.FerroviasArrivals.Direction;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Proximos trenes de las lineas de Trenes Argentinos (SOFSE): Sarmiento,
 * Mitre, Roca, San Martin, Belgrano Sur y Tren de la Costa. Vienen de la
 * API de Trenes de Ariel Aguirre (github.com/ariedro/api-trenes), que deja
 * consultar en publico el servicio de la app oficial; los campos son los
 * de ese servicio. Cada arribo trae el tren (servicio), su sentido, hasta
 * donde va y cuantos segundos faltan:
 *
 *   {"timestamp": 1794505448, "results": [{
 *     "arribo": {"idElemento": 271, "parada": true, "programada": true, "segundos": 4042, ...},
 *     "servicio": {"sentido": 2, "cancelacion": null, "oculto": false,
 *                  "hasta": {"estacion": {"idElemento": 332, "nombre": "Retiro (LGM)"}}, ...}}]}
 *
 * "programada": true quiere decir que el horario es el programado (sin
 * seguimiento del tren); false, que hay una estimacion en vivo.
 */
public final class SofseArrivals {

    /** Linea del sitio -> gerencia de SOFSE (como la llama su API). */
    public static final Map<String, Integer> GERENCIAS = Map.of(
            "SARMIENTO", 1,
            "MITRE", 5,
            "ROCA", 11,
            "BELGRANO_SUR", 21,
            "SAN_MARTIN", 31,
            "TREN_DE_LA_COSTA", 41);

    static final int MAX_PER_DIRECTION = 3;
    /** Un tren que ya paso hace mas de un minuto no se muestra. */
    private static final int PAST_SECONDS = -60;

    private SofseArrivals() {
    }

    /**
     * Los sentidos con sus proximos trenes. scheduledOnly: ninguno tiene
     * estimacion en vivo (todos son del horario programado).
     * destinationIds: el numero de estacion de SOFSE de cada destino, para
     * poder mostrarlo con el nombre que tiene en el sitio.
     */
    public record Parsed(List<Direction> directions, boolean scheduledOnly, Map<String, Integer> destinationIds) {
    }

    /** Una estacion de SOFSE con su ubicacion. */
    public record Station(int id, String name, double latitude, double longitude) {
    }

    private record Item(int sentido, int seconds, boolean scheduled, String destination) {
    }

    /** Hasta donde se busca la estacion nuestra que corresponde a una de SOFSE. */
    public static final double MAX_METERS = 450;

    /**
     * Lee la respuesta de /arribos/estacion/{id}. now: cuando se pidio
     * (los segundos que trae cada arribo se cuentan desde su "timestamp").
     */
    public static Parsed parse(JsonNode root, Instant now) {
        long elapsed = 0;
        long timestamp = root.path("timestamp").asLong(0);
        if (timestamp > 0) {
            elapsed = Math.max(0, Math.min(600, now.getEpochSecond() - timestamp));
        }
        List<Item> items = new ArrayList<>();
        Map<String, Integer> destinationIds = new LinkedHashMap<>();
        for (JsonNode result : root.path("results")) {
            JsonNode arrival = result.path("arribo");
            JsonNode service = result.path("servicio");
            if (service.path("oculto").asBoolean(false) || hasValue(service.path("cancelacion"))
                    || !arrival.path("parada").asBoolean(true)) {
                continue;
            }
            JsonNode to = service.path("hasta").path("estacion");
            // Termina aca: es una llegada, no un tren para tomar.
            if (to.path("idElemento").asInt(-1) == arrival.path("idElemento").asInt(-2)) {
                continue;
            }
            if (!arrival.path("segundos").isNumber()) {
                continue;
            }
            int seconds = (int) (arrival.path("segundos").asLong() - elapsed);
            if (seconds < PAST_SECONDS) {
                continue;
            }
            String destination = cleanName(to.path("nombre").asText(""));
            Integer destinationId = number(to.path("idElemento"));
            if (!destination.isEmpty() && destinationId != null) {
                destinationIds.putIfAbsent(destination, destinationId);
            }
            items.add(new Item(service.path("sentido").asInt(0), seconds,
                    arrival.path("programada").asBoolean(true), destination.isEmpty() ? null : destination));
        }
        // El sentido 2 va hacia la cabecera inicial (Retiro, Once, Constitucion...): va primero, como en el resto del sitio.
        Map<Integer, List<Item>> bySentido = new TreeMap<>(Comparator.comparingInt((Integer s) -> s == 2 ? 0 : 1)
                .thenComparingInt(s -> s));
        for (Item item : items) {
            bySentido.computeIfAbsent(item.sentido(), k -> new ArrayList<>()).add(item);
        }
        List<Direction> directions = new ArrayList<>();
        for (Map.Entry<Integer, List<Item>> entry : bySentido.entrySet()) {
            List<Item> list = entry.getValue();
            list.sort(Comparator.comparingInt(Item::seconds));
            List<Item> next = list.subList(0, Math.min(MAX_PER_DIRECTION, list.size()));
            List<Arrival> arrivals = next.stream()
                    .map(i -> new Arrival(Math.max(0, Math.floorDiv(i.seconds(), 60)), i.scheduled(), i.destination()))
                    .toList();
            directions.add(new Direction(entry.getKey(), towards(arrivals), arrivals));
        }
        boolean scheduledOnly = items.stream().allMatch(Item::scheduled);
        return new Parsed(directions, scheduledOnly, destinationIds);
    }

    /**
     * Los mismos trenes con los destinos renombrados (names: nombre de SOFSE
     * -> nombre del sitio; los que no estan quedan como vienen).
     */
    public static Parsed renamed(Parsed parsed, Map<String, String> names) {
        if (names.isEmpty()) {
            return parsed;
        }
        List<Direction> directions = new ArrayList<>();
        for (Direction direction : parsed.directions()) {
            List<Arrival> arrivals = direction.arrivals().stream()
                    .map(a -> new Arrival(a.minutes(), a.estimated(),
                            a.destination() == null ? null : names.getOrDefault(a.destination(), a.destination())))
                    .toList();
            directions.add(new Direction(direction.directionId(), towards(arrivals), arrivals));
        }
        return new Parsed(directions, parsed.scheduledOnly(), parsed.destinationIds());
    }

    /** Hacia donde va el sentido: el destino que mas se repite entre los proximos (a igualdad, el primero). */
    private static String towards(List<Arrival> arrivals) {
        Map<String, Integer> count = new LinkedHashMap<>();
        for (Arrival arrival : arrivals) {
            if (arrival.destination() != null) {
                count.merge(arrival.destination(), 1, Integer::sum);
            }
        }
        return count.entrySet().stream().max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("—");
    }

    /** Lee la respuesta de /infraestructura/estaciones (los numeros vienen como texto). */
    public static List<Station> parseStations(JsonNode array) {
        List<Station> stations = new ArrayList<>();
        for (JsonNode node : array) {
            Integer id = number(node.path("id_estacion"));
            Double lat = decimal(node.path("latitud"));
            Double lon = decimal(node.path("longitud"));
            if (id != null && lat != null && lon != null) {
                stations.add(new Station(id, node.path("nombre").asText(""), lat, lon));
            }
        }
        return stations;
    }

    /** Lee los numeros de ramal de /infraestructura/ramales (campo "id" o "id_ramal"). */
    public static List<Integer> parseBranchIds(JsonNode array) {
        List<Integer> ids = new ArrayList<>();
        for (JsonNode node : array) {
            Integer id = number(node.has("id_ramal") ? node.path("id_ramal") : node.path("id"));
            if (id != null && !ids.contains(id)) {
                ids.add(id);
            }
        }
        return ids;
    }

    /**
     * La estacion de SOFSE mas cercana a la nuestra, si esta a menos de
     * maxMeters (con los nombres distintos de cada lado, "V. Ballester" o
     * "Villa Ballester", la ubicacion es lo que mejor las empareja).
     */
    public static Station nearest(List<Station> stations, double latitude, double longitude, double maxMeters) {
        Station best = null;
        double bestMeters = maxMeters;
        for (Station station : stations) {
            double meters = meters(latitude, longitude, station.latitude(), station.longitude());
            if (meters <= bestMeters) {
                best = station;
                bestMeters = meters;
            }
        }
        return best;
    }

    /** Distancia aproximada en metros (equirectangular: alcanza para unos cientos de metros). */
    static double meters(double lat1, double lon1, double lat2, double lon2) {
        double x = Math.toRadians(lon2 - lon1) * Math.cos(Math.toRadians((lat1 + lat2) / 2));
        double y = Math.toRadians(lat2 - lat1);
        return Math.sqrt(x * x + y * y) * 6_371_000;
    }

    /** "Retiro (LGM)" o "Retiro - LSM" -> "Retiro": la sigla de la linea ya se sabe por la tarjeta. */
    static String cleanName(String name) {
        return name.replaceAll("\\s*(\\([A-Z]{2,4}\\)|-\\s*[A-Z]{2,4})\\s*$", "").strip();
    }

    private static boolean hasValue(JsonNode node) {
        return !node.isMissingNode() && !node.isNull() && !(node.isTextual() && node.asText().isBlank());
    }

    private static Integer number(JsonNode node) {
        if (node.isInt() || node.isLong()) {
            return node.asInt();
        }
        try {
            return node.isTextual() ? Integer.valueOf(node.asText().strip()) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Double decimal(JsonNode node) {
        if (node.isNumber()) {
            return node.asDouble();
        }
        try {
            return node.isTextual() && !node.asText().isBlank() ? Double.valueOf(node.asText().strip()) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
