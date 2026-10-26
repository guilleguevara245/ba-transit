package com.batransit.api.eventos;

import com.batransit.api.config.OpenApiConfig;
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
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/eventos")
public class CityEventController {

    public record EventsResponse(Instant apiUpdatedAt, List<CityEvent> events) {
    }

    private final CityEventService service;

    public CityEventController(CityEventService service) {
        this.service = service;
    }

    /** Eventos masivos y cortes vigentes o proximos (API Transporte + carga manual). */
    @GetMapping
    public EventsResponse current() {
        return new EventsResponse(service.apiUpdatedAt(), service.current());
    }

    @Operation(summary = "Carga un evento masivo o corte (requiere el header X-API-Key)")
    @SecurityRequirement(name = OpenApiConfig.API_KEY_SCHEME)
    @PostMapping
    public ResponseEntity<CityEvent> create(@Valid @RequestBody PublicEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @Operation(summary = "Da de baja un evento cargado a mano (requiere el header X-API-Key)")
    @SecurityRequirement(name = OpenApiConfig.API_KEY_SCHEME)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
