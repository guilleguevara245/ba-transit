package com.batransit.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Endpoint minimo de la Fase 1 para confirmar que el servicio esta arriba.
 * El endpoint mas completo /api/v1/status/{mode} de la especificacion
 * (seccion 19) se implementa en la Fase 3, cuando exista el modelo de datos.
 */
@RestController
public class StatusController {

    @GetMapping("/api/v1/status")
    public Map<String, Object> status() {
        return Map.of(
                "service", "ba-transit-backend",
                "status", "UP",
                "timestamp", Instant.now().toString()
        );
    }
}
