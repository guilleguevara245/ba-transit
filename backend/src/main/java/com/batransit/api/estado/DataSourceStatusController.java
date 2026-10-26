package com.batransit.api.estado;

import com.batransit.api.estado.SourceHealth.Check;
import com.batransit.api.estado.SourceHealth.Status;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/** GET /api/v1/estado: como respondio cada fuente de datos la ultima vez. */
@RestController
@RequestMapping("/api/v1/estado")
public class DataSourceStatusController {

    /** overall: OK si ninguna fuente esta fallando ahora; ERROR si alguna falla. */
    public record StatusResponse(Status overall, Instant startedAt, Instant checkedAt, List<Check> sources) {
    }

    private final SourceHealth health;
    private final Instant startedAt = Instant.now();

    public DataSourceStatusController(SourceHealth health) {
        this.health = health;
    }

    @GetMapping
    public StatusResponse status() {
        List<Check> checks = health.checks();
        Status overall = checks.stream().anyMatch(c -> c.status() == Status.ERROR) ? Status.ERROR : Status.OK;
        return new StatusResponse(overall, startedAt, Instant.now(), checks);
    }
}
