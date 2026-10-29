package com.batransit.api.vuelos;

import com.batransit.api.vuelos.FlightModels.FlightsResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vuelos")
public class FlightController {

    private final FlightService service;

    public FlightController(FlightService service) {
        this.service = service;
    }

    /** Aviones en vivo alrededor de Buenos Aires (OpenSky Network). */
    @GetMapping
    public FlightsResponse flights() {
        return service.flights();
    }
}
