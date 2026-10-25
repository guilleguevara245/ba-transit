package com.batransit.api.controller;

import com.batransit.api.config.OpenApiConfig;
import com.batransit.api.dto.AlertRequest;
import com.batransit.api.dto.AlertResponse;
import com.batransit.api.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public List<AlertResponse> findAllActive() {
        return alertService.findAllActive();
    }

    @Operation(summary = "Crea una alerta (requiere el header X-API-Key)")
    @SecurityRequirement(name = OpenApiConfig.API_KEY_SCHEME)
    @PostMapping
    public ResponseEntity<AlertResponse> create(@Valid @RequestBody AlertRequest request) {
        AlertResponse created = alertService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
