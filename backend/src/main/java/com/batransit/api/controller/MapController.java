package com.batransit.api.controller;

import com.batransit.api.dto.MapStation;
import com.batransit.api.service.MapService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/map")
public class MapController {

    private final MapService mapService;

    public MapController(MapService mapService) {
        this.mapService = mapService;
    }

    /**
     * Por ahora solo SUBTE tiene coordenadas cargadas (ver limitaciones
     * documentadas en el README del backend), por eso ese es el default.
     */
    @GetMapping("/stations")
    public List<MapStation> stations(@RequestParam(defaultValue = "SUBTE") String mode) {
        return mapService.stationsByMode(mode);
    }
}
