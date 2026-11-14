package com.batransit.api.trenes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.MapStation;
import com.batransit.api.repository.StationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class TrainArrivalsControllerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String BRANCHES = "[{\"id\": 31}]";
    private static final String STATIONS = "[{\"id_estacion\": 361, \"nombre\": \"San Miguel\", \"latitud\": \"-34.5423\","
            + " \"longitud\": \"-58.7123\"}]";

    /** Un reloj que se puede adelantar. */
    private static final class MovableClock extends Clock {
        Instant now = Instant.parse("2026-11-14T22:03:30Z");

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    /** La API de Trenes de mentira: si up, responde la lista de estaciones y los arribos de San Miguel. */
    private static final class FakeApi extends SofseArrivalsClient {
        boolean up;

        FakeApi(Clock clock) {
            super("https://ejemplo.test/api-trenes", MAPPER, clock, null);
        }

        @Override
        JsonNode get(String path) {
            if (!up) {
                return null;
            }
            if (path.startsWith("/infraestructura/ramales")) {
                return json(BRANCHES);
            }
            if (path.startsWith("/infraestructura/estaciones")) {
                return json(STATIONS);
            }
            try (InputStream in = getClass().getResourceAsStream("/trenes/sofse-arribos-san-miguel.json")) {
                return MAPPER.readTree(in);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }

        private static JsonNode json(String text) {
            try {
                return MAPPER.readTree(text);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }
    }

    @Test
    void siLaApiNoPasoLasEstacionesNoSeRecuerdaQueLaEstacionNoExiste() {
        StationRepository stations = mock(StationRepository.class);
        when(stations.findMapStationsByMode(TransportMode.TREN)).thenReturn(List.of(new MapStation(1L, "San Miguel",
                new BigDecimal("-34.5424"), new BigDecimal("-58.7122"), 1L, 7L, TransportMode.TREN, "SAN_MARTIN",
                "Línea San Martín", "#1d3f8f", 15, null, null, true, "Trenes Argentinos")));
        MovableClock clock = new MovableClock();
        FakeApi api = new FakeApi(clock);
        TrainArrivalsController controller = new TrainArrivalsController(null, api, stations);

        // Recien arrancado, la API no responde: no hay trenes.
        assertThat(controller.arrivals("SAN_MARTIN", "San Miguel").available()).isFalse();

        // Vuelve (pasado el rato de espera de la lista): la estacion se encuentra enseguida, no una hora despues.
        api.up = true;
        clock.now = clock.now.plus(SofseArrivalsClient.CATALOG_BACKOFF).plusSeconds(1);
        assertThat(controller.arrivals("SAN_MARTIN", "San Miguel").available()).isTrue();
    }
}
