package com.batransit.api.trenes;

import com.batransit.api.trenes.FerroviasArrivals.Arrival;
import com.batransit.api.trenes.FerroviasArrivals.Direction;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
 * seguimiento del tren); false, que hay una estimacion en vivo. Ademas
 * cada servicio trae su recorrido ("estaciones", con los segundos que
 * faltan para cada una y el anden donde lo hay), el tipo de servicio
 * ("tipo": "Normal" u otro), una leyenda opcional y si esta cancelado.
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
    /** Con los cancelados que hay entre medio, como mucho estos por sentido. */
    static final int MAX_WITH_CANCELLED = 5;
    /** Viajes que se devuelven para Como llegar. */
    static final int MAX_TRIPS = 4;
    /** Un tren que ya paso hace mas de un minuto no se muestra. */
    private static final int PAST_SECONDS = -60;

    private SofseArrivals() {
    }

    /**
     * Los sentidos con sus proximos trenes. scheduledOnly: ninguno tiene
     * estimacion en vivo (todos son del horario programado).
     * destinationIds: el numero de estacion de SOFSE de cada destino, para
     * poder mostrarlo con el nombre que tiene en el sitio. trains: los
     * trenes con su recorrido, para armar viajes (Como llegar).
     */
    public record Parsed(List<Direction> directions, boolean scheduledOnly, Map<String, Integer> destinationIds,
                         List<Train> trains) {
        public Parsed(List<Direction> directions, boolean scheduledOnly, Map<String, Integer> destinationIds) {
            this(directions, scheduledOnly, destinationIds, List.of());
        }
    }

    /** Una estacion de SOFSE con su ubicacion. */
    public record Station(int id, String name, double latitude, double longitude) {
    }

    /** Una parada del recorrido de un tren: cuando pasa y si para. */
    public record RouteStop(int id, boolean stops, Instant at) {
    }

    /**
     * Un tren que para en la estacion consultada: cuando pasa (at), hacia
     * donde va y su recorrido entero (para saber a que hora llega a otra).
     */
    public record Train(int sentido, Instant at, boolean scheduled, String destination, String platform,
                       String service, String note, boolean cancelled, List<RouteStop> route) {
    }

    /**
     * Un viaje en un tren: cuando sale de una estacion y cuando llega a otra.
     * scheduled: los horarios son los programados (sin seguimiento del tren).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Trip(Instant departure, Instant arrival, boolean scheduled, String destination, String platform,
                       String service, String note, boolean cancelled) {
        Trip withDestination(String name) {
            return new Trip(departure, arrival, scheduled, name, platform, service, note, cancelled);
        }
    }

    /** Hasta donde se busca la estacion nuestra que corresponde a una de SOFSE. */
    public static final double MAX_METERS = 450;

    /**
     * Lee la respuesta de /arribos/estacion/{id}. now: cuando se pidio
     * (los segundos que trae cada arribo se cuentan desde su "timestamp").
     */
    public static Parsed parse(JsonNode root, Instant now) {
        long timestamp = root.path("timestamp").asLong(0);
        // Los "segundos" se cuentan desde el timestamp de la respuesta (si es razonable; si no, desde ahora).
        Instant base = timestamp > 0 && Math.abs(now.getEpochSecond() - timestamp) <= 600
                ? Instant.ofEpochSecond(timestamp) : now;
        List<Train> trains = new ArrayList<>();
        Map<String, Integer> destinationIds = new LinkedHashMap<>();
        for (JsonNode result : root.path("results")) {
            JsonNode arrival = result.path("arribo");
            JsonNode service = result.path("servicio");
            int here = arrival.path("idElemento").asInt(-2);
            if (service.path("oculto").asBoolean(false) || !arrival.path("parada").asBoolean(true)
                    || !forPassengers(service)) {
                continue;
            }
            JsonNode to = service.path("hasta").path("estacion");
            // Termina aca: es una llegada, no un tren para tomar.
            if (to.path("idElemento").asInt(-1) == here || !arrival.path("segundos").isNumber()) {
                continue;
            }
            Instant at = base.plusSeconds(arrival.path("segundos").asLong());
            if (at.isBefore(now.plusSeconds(PAST_SECONDS))) {
                continue;
            }
            String destination = cleanName(to.path("nombre").asText(""));
            Integer destinationId = number(to.path("idElemento"));
            if (!destination.isEmpty() && destinationId != null) {
                destinationIds.putIfAbsent(destination, destinationId);
            }
            List<RouteStop> route = route(service.path("estaciones"), base);
            trains.add(new Train(service.path("sentido").asInt(0), at, !hasLiveTimes(arrival),
                    destination.isEmpty() ? null : destination, platform(arrival, service, here),
                    serviceType(service), text(service.path("leyenda")), hasValue(service.path("cancelacion")),
                    route));
        }
        trains.sort(Comparator.comparing(Train::at));
        // El sentido 2 va hacia la cabecera inicial (Retiro, Once, Constitucion...): va primero, como en el resto del sitio.
        Map<Integer, List<Train>> bySentido = new TreeMap<>(Comparator.comparingInt((Integer s) -> s == 2 ? 0 : 1)
                .thenComparingInt(s -> s));
        for (Train train : trains) {
            bySentido.computeIfAbsent(train.sentido(), k -> new ArrayList<>()).add(train);
        }
        List<Direction> directions = new ArrayList<>();
        for (Map.Entry<Integer, List<Train>> entry : bySentido.entrySet()) {
            List<Arrival> arrivals = new ArrayList<>();
            int running = 0;
            for (Train train : entry.getValue()) {
                if (running == MAX_PER_DIRECTION || arrivals.size() == MAX_WITH_CANCELLED) {
                    break;
                }
                long seconds = train.at().getEpochSecond() - now.getEpochSecond();
                arrivals.add(new Arrival((int) Math.max(0, Math.floorDiv(seconds, 60)), train.scheduled(),
                        train.destination(), train.platform(), train.service(), train.note(), train.cancelled()));
                if (!train.cancelled()) {
                    running++;
                }
            }
            if (running > 0) {
                directions.add(new Direction(entry.getKey(), towards(arrivals), List.copyOf(arrivals)));
            }
        }
        boolean scheduledOnly = trains.stream().filter(t -> !t.cancelled()).allMatch(Train::scheduled);
        return new Parsed(directions, scheduledOnly, destinationIds, List.copyOf(trains));
    }

    /**
     * Los proximos trenes que van de la estacion consultada a otra (por su
     * numero de SOFSE) y paran ahi: cuando salen y cuando llegan.
     */
    public static List<Trip> trips(Parsed parsed, int toId, Instant now) {
        List<Trip> trips = new ArrayList<>();
        int running = 0;
        for (Train train : parsed.trains()) {
            if (running == MAX_TRIPS) {
                break;
            }
            if (train.at().isBefore(now.plusSeconds(PAST_SECONDS))) {
                continue;
            }
            RouteStop stop = train.route().stream()
                    .filter(s -> s.id() == toId && s.stops() && s.at() != null && s.at().isAfter(train.at()))
                    .findFirst().orElse(null);
            if (stop == null) {
                continue;
            }
            trips.add(new Trip(train.at(), stop.at(), train.scheduled(), train.destination(), train.platform(),
                    train.service(), train.note(), train.cancelled()));
            if (!train.cancelled()) {
                running++;
            }
        }
        return trips;
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
                    .map(a -> a.destination() == null ? a
                            : a.withDestination(names.getOrDefault(a.destination(), a.destination())))
                    .toList();
            directions.add(new Direction(direction.directionId(), towards(arrivals), arrivals));
        }
        return new Parsed(directions, parsed.scheduledOnly(), parsed.destinationIds(), parsed.trains());
    }

    /** Los viajes con los destinos renombrados, como en renamed. */
    public static List<Trip> renamedTrips(List<Trip> trips, Map<String, String> names) {
        return trips.stream()
                .map(t -> t.destination() == null ? t
                        : t.withDestination(names.getOrDefault(t.destination(), t.destination())))
                .toList();
    }

    /**
     * Hacia donde va el sentido: el destino que mas se repite entre los
     * proximos que corren (a igualdad, el primero).
     */
    private static String towards(List<Arrival> arrivals) {
        Map<String, Integer> count = new LinkedHashMap<>();
        for (Arrival arrival : arrivals) {
            if (arrival.destination() != null && !arrival.cancelled()) {
                count.merge(arrival.destination(), 1, Integer::sum);
            }
        }
        return count.entrySet().stream().max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("—");
    }

    /** El recorrido del tren: cada estacion con cuando pasa (en vivo si lo hay) y si para. */
    private static List<RouteStop> route(JsonNode stations, Instant base) {
        List<RouteStop> route = new ArrayList<>();
        for (JsonNode station : stations) {
            Integer id = number(station.path("idElemento"));
            if (id == null) {
                continue;
            }
            Instant at = station.path("segundos").isNumber()
                    ? base.plusSeconds(station.path("segundos").asLong())
                    : instant(station.path("llegada").path("programada"));
            if (at == null) {
                at = instant(station.path("salida").path("programada"));
            }
            route.add(new RouteStop(id, station.path("parada").asBoolean(true), at));
        }
        return List.copyOf(route);
    }

    /**
     * Si una parada del tren trae hora estimada o real: el tren esta seguido
     * en vivo. Ojo: "programada" no dice eso, dice si el servicio esta en el
     * horario oficial (un tren "Especial" viene con programada=false aunque
     * no tenga seguimiento, y los del horario con programada=true aunque lo
     * tengan).
     */
    static boolean hasLiveTimes(JsonNode stop) {
        return hasValue(stop.path("llegada").path("estimada")) || hasValue(stop.path("salida").path("estimada"))
                || hasValue(stop.path("llegada").path("real")) || hasValue(stop.path("salida").path("real"));
    }

    /**
     * Un tren andando, con su posicion en vivo (el GPS que manda la
     * formacion, campo "location"). nextStation y minutesToNext: la proxima
     * estacion donde para y cuanto le falta.
     */
    public record LiveTrain(String id, int number, int sentido, double latitude, double longitude, String destination,
                            String branch, String service, String nextStation, Integer minutesToNext) {
    }

    /**
     * Los trenes de una respuesta de /arribos/estacion/{id} que ya salieron
     * de su cabecera (tienen hora real de salida) y todavia no llegaron, con
     * su posicion. Un tren que espera en la cabecera manda la posicion de la
     * formacion parada: no se muestra hasta que sale.
     */
    public static List<LiveTrain> liveTrains(JsonNode root, Instant now) {
        long timestamp = root.path("timestamp").asLong(0);
        Instant base = timestamp > 0 && Math.abs(now.getEpochSecond() - timestamp) <= 600
                ? Instant.ofEpochSecond(timestamp) : now;
        List<LiveTrain> result = new ArrayList<>();
        for (JsonNode item : root.path("results")) {
            JsonNode service = item.path("servicio");
            JsonNode location = service.path("location");
            Double lat = decimal(location.path("lat"));
            Double lon = decimal(location.path("long").isMissingNode() ? location.path("lon") : location.path("long"));
            if (lat == null || lon == null || service.path("oculto").asBoolean(false) || !forPassengers(service)
                    || hasValue(service.path("cancelacion"))) {
                continue;
            }
            JsonNode from = service.path("desde").path("estacion");
            JsonNode to = service.path("hasta").path("estacion");
            boolean departed = hasValue(from.path("salida").path("real"));
            boolean arrived = hasValue(to.path("llegada").path("real"));
            if (!departed || arrived) {
                continue;
            }
            JsonNode next = null;
            for (JsonNode station : service.path("estaciones")) {
                if (!station.path("parada").asBoolean(false) || !station.path("segundos").isNumber()
                        || hasValue(station.path("llegada").path("real"))) {
                    continue;
                }
                long seconds = base.plusSeconds(station.path("segundos").asLong()).getEpochSecond() - now.getEpochSecond();
                if (seconds >= -30 && (next == null || station.path("segundos").asLong() < next.path("segundos").asLong())) {
                    next = station;
                }
            }
            Integer minutes = null;
            String nextName = null;
            if (next != null) {
                long seconds = base.plusSeconds(next.path("segundos").asLong()).getEpochSecond() - now.getEpochSecond();
                minutes = (int) Math.max(0, Math.floorDiv(seconds, 60));
                nextName = cleanName(next.path("nombre").asText(""));
            }
            String destination = cleanName(to.path("nombre").asText(""));
            String id = text(service.path("id"));
            result.add(new LiveTrain(id != null ? id : String.valueOf(service.path("numero").asInt()),
                    service.path("numero").asInt(0), service.path("sentido").asInt(0), lat, lon,
                    destination.isEmpty() ? null : destination, text(service.path("ramal").path("nombre")),
                    serviceType(service), nextName, minutes));
        }
        return List.copyOf(result);
    }

    /** Cada cuantas estaciones de un ramal se miran los trenes andando. */
    static final int WATCH_EVERY = 6;

    /**
     * Donde mirar los trenes de un ramal: la segunda estacion, una cada
     * WATCH_EVERY y la anteultima. Todo tren andando va hacia una de las
     * cabeceras y figura en los arribos de la proxima de esas que le toca
     * (en la cabecera misma solo figuran los que salen); las del medio son
     * para los que terminan antes de la cabecera (un Retiro - Jose C. Paz
     * no llega a la anteultima del ramal a Pilar). stations: las del
     * ramal, en orden.
     */
    public static List<Integer> watchStations(List<Station> stations) {
        if (stations.size() < 3) {
            return stations.stream().map(Station::id).toList();
        }
        int beforeLast = stations.size() - 2;
        Set<Integer> watch = new LinkedHashSet<>();
        for (int i = 1; i < beforeLast; i += WATCH_EVERY) {
            watch.add(stations.get(i).id());
        }
        watch.add(stations.get(beforeLast).id());
        return List.copyOf(watch);
    }

    /** El anden donde para el tren en esta estacion, si lo informan. */
    private static String platform(JsonNode arrival, JsonNode service, int here) {
        String own = text(arrival.path("anden").path("nombre"));
        if (own != null) {
            return own;
        }
        for (JsonNode station : service.path("estaciones")) {
            if (station.path("idElemento").asInt(-1) == here) {
                return text(station.path("anden").path("nombre"));
            }
        }
        return null;
    }

    /** El tipo de servicio si no es el comun ("Rapido", "Expreso"...); null si es el comun. */
    private static String serviceType(JsonNode service) {
        String name = text(service.path("tipo").path("nombre"));
        return name == null || name.equalsIgnoreCase("Normal") ? null : name;
    }

    /** Los trenes sin pasajeros (vacios, de traslado) no se muestran. */
    private static boolean forPassengers(JsonNode service) {
        String kind = text(service.path("tipo").path("clasificacion").path("nombre"));
        return kind == null || kind.toLowerCase(Locale.ROOT).contains("pasajer");
    }

    /** Un texto (o el texto de un objeto: "texto", "descripcion", "nombre"); null si esta vacio. */
    static String text(JsonNode node) {
        if (node.isObject()) {
            for (String field : List.of("texto", "descripcion", "nombre", "leyenda")) {
                String value = text(node.path(field));
                if (value != null) {
                    return value;
                }
            }
            return null;
        }
        if (!node.isTextual()) {
            return null;
        }
        // Tambien los espacios que no cortan (el texto de las alertas los trae).
        String value = node.asText().replaceAll("[\\s\\u00a0\\u202f]+", " ").strip();
        return value.isEmpty() ? null : value;
    }

    private static Instant instant(JsonNode node) {
        try {
            return node.isTextual() ? Instant.parse(node.asText().strip()) : null;
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /**
     * Los tipos de servicio de una respuesta de arribos, uno por linea y
     * tipo ("Mitre: id 1 \"Normal\" (Pasajeros, subclasificacion 1)"), para
     * ir anotando cuales existen (la API no los documenta).
     */
    public static List<String> serviceTypes(JsonNode root) {
        Set<String> types = new LinkedHashSet<>();
        for (JsonNode result : root.path("results")) {
            JsonNode service = result.path("servicio");
            JsonNode type = service.path("tipo");
            if (type.isMissingNode() || type.isNull()) {
                continue;
            }
            types.add("%s: id %s \"%s\" (%s, subclasificacion %s)".formatted(
                    service.path("gerencia").path("nombre").asText("?"), type.path("id").asText("?"),
                    type.path("nombre").asText(""), type.path("clasificacion").path("nombre").asText("?"),
                    type.path("subclasificacion").asText("?")));
        }
        return List.copyOf(types);
    }

    /** Las leyendas de los servicios tal como vienen (texto u objeto), con su linea: "Roca: ...". */
    public static List<String> legends(JsonNode root) {
        Set<String> legends = new LinkedHashSet<>();
        for (JsonNode result : root.path("results")) {
            JsonNode service = result.path("servicio");
            JsonNode legend = service.path("leyenda");
            if (hasValue(legend)) {
                String raw = legend.isTextual() ? legend.asText() : legend.toString();
                legends.add(service.path("gerencia").path("nombre").asText("?") + ": "
                        + (raw.length() > 300 ? raw.substring(0, 300) + "..." : raw));
            }
        }
        return List.copyOf(legends);
    }

    /**
     * Las estaciones donde empiezan los ramales de una linea (de
     * /infraestructura/ramales), sin repetir: ahi pasan todos los trenes del
     * ramal, los que salen y los que llegan.
     */
    public static List<Integer> branchStarts(JsonNode branches) {
        List<Integer> ids = new ArrayList<>();
        for (JsonNode branch : branches) {
            Integer id = number(branch.path("id_estacion_inicial"));
            if (id == null) {
                id = number(branch.path("cabecera_inicial").path("id"));
            }
            if (id != null && !ids.contains(id)) {
                ids.add(id);
            }
        }
        return ids;
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
