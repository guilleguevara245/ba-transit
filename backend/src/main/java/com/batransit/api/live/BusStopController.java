package com.batransit.api.live;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;
import com.batransit.api.colectivos.ColectivoService;
import com.batransit.api.exception.NotFoundException;
import com.batransit.api.live.BusPositionsController.Vehicle;
import com.batransit.api.live.StopArrivals.Approaching;
import com.batransit.api.live.TransporteLiveClient.Fetched;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Una parada favorita: los colectivos de esa linea que vienen hacia ella,
 * con cuantos minutos y paradas les faltan. Usa el recorrido del GTFS (las
 * paradas en orden y los minutos entre ellas) y las posiciones en vivo.
 */
@RestController
@RequestMapping("/api/v1/colectivos")
public class BusStopController {

    /**
     * line y headsign: el cartel y hacia donde va el sentido; stopName: la
     * parada. live: si hay datos en vivo (si no, buses vacio no quiere
     * decir que no venga ninguno). lines: los carteles que paran aca
     * (la linea elegida primero); cada colectivo trae el suyo.
     */
    public record StopResponse(String routeId, String line, int direction, String headsign, String stopId,
                               String stopName, boolean live, Instant updatedAt, List<Approaching> buses,
                               List<String> lines) {
    }

    private final TransporteLiveClient client;
    private final ColectivoService service;

    public BusStopController(TransporteLiveClient client, ColectivoService service) {
        this.client = client;
        this.service = service;
    }

    @GetMapping("/{routeId}/parada/{stopId}")
    public StopResponse stop(@PathVariable String routeId, @PathVariable String stopId,
                             @RequestParam(name = "sentido", defaultValue = "0") int directionId) {
        BusRoute route = service.find(routeId);
        BusDirection direction = route.directions().stream()
                .filter(d -> d.directionId() == directionId)
                .findFirst()
                .orElseThrow(() -> new NotFoundException("La línea " + route.shortName() + " no tiene ese sentido."));
        int stopIndex = indexOf(direction.stops(), stopId);
        if (stopIndex < 0) {
            throw new NotFoundException("La parada ya no está en el recorrido de la línea " + route.shortName() + ".");
        }
        BusStop stop = direction.stops().get(stopIndex);

        // Los otros carteles de la linea que paran aca (42A y 42B): se avisa de todos, cada uno con su cartel.
        List<BusRoute> others = service.otherSignsAtStop(route, stopId);
        List<String> lines = new ArrayList<>();
        lines.add(route.shortName());
        others.forEach(r -> lines.add(r.shortName()));

        Optional<Fetched> feed = client.get("/colectivos/vehiclePositionsSimple", BusPositionsController.MAX_AGE);
        if (feed.isEmpty()) {
            return new StopResponse(route.id(), route.shortName(), directionId, direction.headsign(), stop.id(),
                    stop.name(), false, null, List.of(), lines);
        }
        long now = Instant.now().getEpochSecond();
        List<Approaching> buses = new ArrayList<>(approachingFor(feed.get(), route, direction, stopIndex, now));
        for (BusRoute other : others) {
            for (BusDirection d : other.directions()) {
                int index = indexOf(d.stops(), stopId);
                if (index >= 0) {
                    buses.addAll(approachingFor(feed.get(), other, d, index, now));
                    break;
                }
            }
        }
        return new StopResponse(route.id(), route.shortName(), directionId, direction.headsign(), stop.id(), stop.name(),
                true, feed.get().fetchedAt(), StopArrivals.merge(buses), lines);
    }

    /** Los colectivos de una linea que vienen a la parada stopIndex de ese sentido, con su cartel. */
    private static List<Approaching> approachingFor(Fetched feed, BusRoute route, BusDirection direction,
                                                    int stopIndex, long now) {
        List<Vehicle> vehicles = BusPositionsController.vehiclesOf(feed.body(), route.id(), route.shortName(), now);
        return StopArrivals.approaching(direction, stopIndex, sameDirection(route, direction, vehicles)).stream()
                .map(a -> a.withLine(route.shortName()))
                .toList();
    }

    /** La primera vez que el sentido pasa por la parada. */
    static int indexOf(List<BusStop> stops, String stopId) {
        for (int i = 0; i < stops.size(); i++) {
            if (stops.get(i).id().equals(stopId)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Los colectivos del sentido. El feed en vivo usa el mismo direction_id
     * que el GTFS; si ninguno coincide (o la linea tiene un solo sentido),
     * se usan todos y decide su posicion sobre el recorrido.
     */
    static List<Vehicle> sameDirection(BusRoute route, BusDirection direction, List<Vehicle> vehicles) {
        Set<Integer> known = route.directions().stream().map(BusDirection::directionId).collect(Collectors.toSet());
        boolean matches = route.directions().size() > 1 && vehicles.stream().anyMatch(v -> known.contains(v.direction()));
        return matches ? vehicles.stream().filter(v -> v.direction() == direction.directionId()).toList() : vehicles;
    }
}
