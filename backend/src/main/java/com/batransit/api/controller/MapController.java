package com.batransit.api.controller;

import com.batransit.api.domain.TransportMode;
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
     * GET /api/v1/map/stations devuelve las estaciones con coordenadas de
     * todos los modos; con ?mode=TREN filtra por modo. Las estaciones
     * sin coordenadas cargadas no se incluyen.
     */
    @GetMapping("/stations")
    public List<MapStation> stations(@RequestParam(required = false) String mode) {
        if (mode == null || mode.isBlank()) {
            return mapService.allStations();
        }
        return mapService.stationsByMode(TransportMode.from(mode));
    }
}
