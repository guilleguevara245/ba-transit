package com.batransit.api.estado;

import com.batransit.api.estado.SourceHealth.Check;
import com.batransit.api.estado.SourceHealth.Source;
import com.batransit.api.estado.SourceHealth.Status;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SourceHealthTest {

    /** Reloj que avanza un segundo en cada consulta. */
    private static Clock ticking() {
        return new Clock() {
            private long seconds = 1_800_000_000L;

            @Override
            public ZoneOffset getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(java.time.ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return Instant.ofEpochSecond(seconds++);
            }
        };
    }

    private static Check check(SourceHealth health, Source source) {
        List<Check> checks = health.checks();
        return checks.get(source.ordinal());
    }

    @Test
    void sinConsultasQuedaSinDatos() {
        SourceHealth health = new SourceHealth(ticking());
        Check smn = check(health, Source.SMN);
        assertEquals(Status.SIN_DATOS, smn.status());
        assertEquals("smn", smn.key());
        assertEquals(Source.values().length, health.checks().size());
    }

    @Test
    void elUltimoResultadoDefineElEstado() {
        SourceHealth health = new SourceHealth(ticking());
        health.ok(Source.FERROVIAS);
        assertEquals(Status.OK, check(health, Source.FERROVIAS).status());

        // Una falla aislada despues de responder bien no la marca caida.
        health.fail(Source.FERROVIAS, "SocketTimeoutException");
        assertEquals(Status.OK, check(health, Source.FERROVIAS).status());

        health.fail(Source.FERROVIAS, "HTTP 503");
        Check failed = check(health, Source.FERROVIAS);
        assertEquals(Status.ERROR, failed.status());
        assertEquals("HTTP 503", failed.lastError());

        health.ok(Source.FERROVIAS);
        Check recovered = check(health, Source.FERROVIAS);
        assertEquals(Status.OK, recovered.status());
        // Se conserva cuando fue la ultima falla, para mostrarla.
        assertEquals("HTTP 503", recovered.lastError());
    }

    @Test
    void unaFallaSinExitosPreviosEsError() {
        SourceHealth health = new SourceHealth(ticking());
        health.fail(Source.METROVIAS, "sin respuesta");
        Check metrovias = check(health, Source.METROVIAS);
        assertEquals(Status.ERROR, metrovias.status());
        assertNull(metrovias.lastSuccess());
    }

    @Test
    void elRegistroVacioNoGuardaNada() {
        SourceHealth.NOOP.fail(Source.SMN, "x");
        assertEquals(Status.SIN_DATOS, check(SourceHealth.NOOP, Source.SMN).status());
    }
}
