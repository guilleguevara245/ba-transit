package com.batransit.api.clima;

import com.batransit.api.clima.ForecastService.Forecast;
import com.batransit.api.clima.WeatherAlertService.WeatherAlert;
import com.batransit.api.exception.BadRequestException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/clima")
public class WeatherAlertController {

    /** available = false hasta la primera lectura correcta del feed. */
    public record AlertsResponse(boolean available, Instant updatedAt, List<WeatherAlert> alerts) {
    }

    private final WeatherAlertService service;
    private final ForecastService forecasts;

    public WeatherAlertController(WeatherAlertService service, ForecastService forecasts) {
        this.service = service;
        this.forecasts = forecasts;
    }

    /**
     * GET /api/v1/clima/alertas: alertas del SMN vigentes (tormentas, lluvias y
     * calor). Con lat y lon, solo las que alcanzan ese punto; sin ellos, las
     * de todo el AMBA.
     */
    @GetMapping("/alertas")
    public AlertsResponse alerts(@RequestParam(required = false) Double lat, @RequestParam(required = false) Double lon) {
        List<WeatherAlert> alerts = lat != null && lon != null && ForecastService.inArea(lat, lon)
                ? service.forPoint(lat, lon)
                : service.current();
        return new AlertsResponse(service.updatedAt() != null, service.updatedAt(), alerts);
    }

    /**
     * GET /api/v1/clima/pronostico?lat=..&lon=..: ahora, las proximas 24 horas
     * y el dia de hoy (Open-Meteo), para la celda de unos 5 km del punto.
     * Solo puntos del AMBA.
     */
    @GetMapping("/pronostico")
    public ResponseEntity<Forecast> forecast(@RequestParam double lat, @RequestParam double lon) {
        if (!ForecastService.inArea(lat, lon)) {
            throw new BadRequestException("El pronóstico es solo para el AMBA.");
        }
        Forecast forecast = forecasts.forecast(lat, lon)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "El pronóstico no está disponible por el momento."));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES)).body(forecast);
    }
}
