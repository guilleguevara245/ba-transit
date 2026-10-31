package com.batransit.api.direcciones;

import com.batransit.api.direcciones.AddressService.Address;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class AddressController {

    private final AddressService service;
    private final AddressRateLimiter limiter;

    public AddressController(AddressService service, AddressRateLimiter limiter) {
        this.service = service;
        this.limiter = limiter;
    }

    /**
     * GET /api/v1/direcciones?q=Origone 151: direcciones del AMBA que coinciden
     * (Georef), para confirmar Casa, Trabajo u otro lugar. 503 si Georef no
     * responde; 429 si la misma IP busco demasiadas veces seguidas.
     */
    @GetMapping("/api/v1/direcciones")
    public List<Address> search(@RequestParam("q") String query, HttpServletRequest request) {
        if (!limiter.tryAcquire(clientIp(request))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiadas búsquedas seguidas. Esperá unos minutos.");
        }
        return service.search(query).orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "La búsqueda de direcciones no está disponible por el momento."));
    }

    /** La IP de quien pide (Render la manda en X-Forwarded-For). */
    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].strip() : request.getRemoteAddr();
    }
}
