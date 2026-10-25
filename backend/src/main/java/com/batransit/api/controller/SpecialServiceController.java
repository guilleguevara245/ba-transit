package com.batransit.api.controller;

import com.batransit.api.config.OpenApiConfig;
import com.batransit.api.dto.SpecialServiceRequest;
import com.batransit.api.dto.SpecialServiceResponse;
import com.batransit.api.service.SpecialServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/servicios-especiales")
public class SpecialServiceController {

    private final SpecialServiceService service;

    public SpecialServiceController(SpecialServiceService service) {
        this.service = service;
    }

    /** Servicios especiales vigentes hoy (todos, o los de una linea con ?lineId=). */
    @GetMapping
    public List<SpecialServiceResponse> validToday(@RequestParam(required = false) Long lineId) {
        return service.findValidToday(lineId);
    }

    @Operation(summary = "Carga un servicio especial (requiere el header X-API-Key)")
    @SecurityRequirement(name = OpenApiConfig.API_KEY_SCHEME)
    @PostMapping
    public ResponseEntity<SpecialServiceResponse> create(@Valid @RequestBody SpecialServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @Operation(summary = "Da de baja un servicio especial (requiere el header X-API-Key)")
    @SecurityRequirement(name = OpenApiConfig.API_KEY_SCHEME)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
