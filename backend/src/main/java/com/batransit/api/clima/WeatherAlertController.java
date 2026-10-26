package com.batransit.api.clima;

import com.batransit.api.clima.WeatherAlertService.WeatherAlert;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/clima")
public class WeatherAlertController {

    /** available = false hasta la primera lectura correcta del feed. */
    public record AlertsResponse(boolean available, Instant updatedAt, List<WeatherAlert> alerts) {
    }

    private final WeatherAlertService service;

    public WeatherAlertController(WeatherAlertService service) {
        this.service = service;
    }

    /** GET /api/v1/clima/alertas: alertas del SMN vigentes para el AMBA (tormentas, lluvias, calor, viento). */
    @GetMapping("/alertas")
    public AlertsResponse alerts() {
        return new AlertsResponse(service.updatedAt() != null, service.updatedAt(), service.current());
    }
}
