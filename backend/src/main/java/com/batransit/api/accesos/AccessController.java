package com.batransit.api.accesos;

import com.batransit.api.accesos.AccessModels.AccessReport;
import com.batransit.api.accesos.AccessModels.AccessesResponse;
import com.batransit.api.accesos.AccessModels.DirectionReport;
import com.batransit.api.accesos.AccessModels.SegmentReport;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accesos")
public class AccessController {

    private final AccessService service;

    public AccessController(AccessService service) {
        this.service = service;
    }

    /**
     * Estado de los cuatro accesos principales (se actualiza cada 20 minutos).
     * Con resumen=true (la tarjeta del inicio) se omite el recorrido de cada
     * mano: el del tramo alcanza para ubicar cortes y la respuesta pesa un
     * tercio.
     */
    @GetMapping
    public AccessesResponse accesses(@RequestParam(name = "resumen", defaultValue = "false") boolean summary) {
        AccessesResponse response = service.report();
        return summary ? summarize(response) : response;
    }

    static AccessesResponse summarize(AccessesResponse response) {
        List<AccessReport> accesses = response.accesses().stream()
                .map(a -> new AccessReport(a.id(), a.name(), a.road(), a.connects(), a.operator(),
                        a.segments().stream().map(AccessController::withoutDirectionGeometry).toList()))
                .toList();
        return new AccessesResponse(response.configured(), response.updatedAt(), accesses);
    }

    private static SegmentReport withoutDirectionGeometry(SegmentReport s) {
        List<DirectionReport> directions = s.directions().stream()
                .map(d -> new DirectionReport(d.towards(), d.status(), d.currentSpeed(), d.freeFlowSpeed(), List.of()))
                .toList();
        return new SegmentReport(s.name(), s.status(), s.currentSpeed(), s.freeFlowSpeed(), s.checkLocation(),
                s.geometry(), directions);
    }
}
