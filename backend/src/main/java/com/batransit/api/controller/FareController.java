package com.batransit.api.controller;

import com.batransit.api.config.OpenApiConfig;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.FareRequest;
import com.batransit.api.dto.FareResponse;
import com.batransit.api.service.FareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fares")
public class FareController {

    private final FareService fareService;

    public FareController(FareService fareService) {
        this.fareService = fareService;
    }

    /**
     * GET /api/v1/fares devuelve todas las tarifas vigentes;
     * GET /api/v1/fares?mode=TREN filtra por modo.
     */
    @GetMapping
    public List<FareResponse> findActive(@RequestParam(required = false) String mode) {
        if (mode == null || mode.isBlank()) {
            return fareService.findAllActive();
        }
        return fareService.findActiveByMode(TransportMode.from(mode));
    }

    @Operation(summary = "Crea una tarifa (requiere el header X-API-Key)")
    @SecurityRequirement(name = OpenApiConfig.API_KEY_SCHEME)
    @PostMapping
    public ResponseEntity<FareResponse> create(@Valid @RequestBody FareRequest request) {
        FareResponse created = fareService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
