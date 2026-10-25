package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/colectivos")
public class ColectivoController {

    public record Status(boolean available, int routes, Instant loadedAt) {
    }

    public record RouteSummary(String id, String shortName, String longName, String agency, String color) {
        static RouteSummary from(BusRoute r) {
            return new RouteSummary(r.id(), r.shortName(), r.longName(), r.agency(), r.color());
        }
    }

    public record Direction(int directionId, String headsign, List<double[]> shape, List<BusStop> stops) {
        static Direction from(BusDirection d) {
            return new Direction(d.directionId(), d.headsign(), d.shape(), d.stops());
        }
    }

    public record RouteDetail(String id, String shortName, String longName, String agency, String color,
                              List<Direction> directions) {
        static RouteDetail from(BusRoute r) {
            return new RouteDetail(r.id(), r.shortName(), r.longName(), r.agency(), r.color(),
                    r.directions().stream().map(Direction::from).toList());
        }
    }

    private final ColectivoService service;

    public ColectivoController(ColectivoService service) {
        this.service = service;
    }

    /** Si los datos ya estan cargados, cuantas lineas hay y desde cuando. */
    @GetMapping("/estado")
    public Status status() {
        return service.current()
                .map(c -> new Status(true, c.routes().size(), c.loadedAt()))
                .orElse(new Status(false, 0, null));
    }

    /** GET /api/v1/colectivos?q=152 */
    @GetMapping
    public List<RouteSummary> search(@RequestParam("q") String query) {
        return service.search(query).stream().map(RouteSummary::from).toList();
    }

    @GetMapping("/{routeId}")
    public RouteDetail detail(@PathVariable String routeId) {
        return RouteDetail.from(service.find(routeId));
    }
}
