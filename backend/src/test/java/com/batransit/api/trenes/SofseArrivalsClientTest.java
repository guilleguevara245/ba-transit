package com.batransit.api.trenes;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class SofseArrivalsClientTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final int SAN_MARTIN = 31;
    private static final String BRANCHES = "[{\"id\": 31}]";
    private static final String STATIONS = "[{\"id_estacion\": 101, \"nombre\": \"Retiro\", \"latitud\": \"-34.5888\","
            + " \"longitud\": \"-58.3740\"}, {\"id_estacion\": 115, \"nombre\": \"San Miguel\", \"latitud\": \"-34.5423\","
            + " \"longitud\": \"-58.7123\"}]";

    /** Un reloj que se puede adelantar. */
    private static final class MovableClock extends Clock {
        Instant now = Instant.parse("2026-11-14T22:03:30Z");

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
            return now;
        }
    }

    /** La API de mentira: responde la lista de estaciones si up, y anota lo que se le pidio. */
    private static class FakeApi extends SofseArrivalsClient {
        boolean up = true;
        Runnable duringFailure;
        final List<String> asked = new ArrayList<>();

        FakeApi(Clock clock) {
            super("https://ejemplo.test/api-trenes", MAPPER, clock, null);
        }

        @Override
        JsonNode get(String path) {
            asked.add(path);
            if (!up) {
                if (duringFailure != null) {
                    Runnable meanwhile = duringFailure;
                    duringFailure = null;
                    up = true;
                    meanwhile.run();
                    up = false;
                }
                return null;
            }
            try {
                return MAPPER.readTree(path.startsWith("/infraestructura/ramales") ? BRANCHES : STATIONS);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }
    }

    @Test
    void unaListaTraidaPorOtroPedidoNoSePisaConLaVaciaDeUnoQueFallo() {
        FakeApi api = new FakeApi(new MovableClock());
        api.up = false;
        // Mientras este pedido espera y falla, otro trae la lista entera.
        api.duringFailure = () -> assertThat(api.stationId(SAN_MARTIN, -34.5423, -58.7123).orElse(null)).isEqualTo(115);

        assertThat(api.stationId(SAN_MARTIN, -34.5888, -58.3740).orElse(null)).isEqualTo(101);
        assertThat(api.knowsStations(SAN_MARTIN)).isTrue();
        // Y queda guardada: no se vuelve a pedir.
        int asked = api.asked.size();
        assertThat(api.stationId(SAN_MARTIN, -34.5423, -58.7123).orElse(null)).isEqualTo(115);
        assertThat(api.asked).hasSize(asked);
    }

    @Test
    void siLaApiNoRespondeNoSeConocenLasEstaciones() {
        FakeApi api = new FakeApi(new MovableClock());
        api.up = false;

        assertThat(api.stationId(SAN_MARTIN, -34.5423, -58.7123)).isEmpty();
        assertThat(api.knowsStations(SAN_MARTIN)).isFalse();
    }

    @Test
    void siFallaAlRenovarSeSigueUsandoLaViejaYSeReintentaEnUnRato() {
        MovableClock clock = new MovableClock();
        FakeApi api = new FakeApi(clock);
        assertThat(api.knowsStations(SAN_MARTIN)).isTrue();

        clock.now = clock.now.plus(SofseArrivalsClient.CATALOG_MAX_AGE).plusSeconds(1);
        api.up = false;
        assertThat(api.stationId(SAN_MARTIN, -34.5423, -58.7123).orElse(null)).isEqualTo(115);

        int asked = api.asked.size();
        clock.now = clock.now.plus(SofseArrivalsClient.CATALOG_BACKOFF).minus(Duration.ofSeconds(5));
        assertThat(api.knowsStations(SAN_MARTIN)).isTrue();
        assertThat(api.asked).hasSize(asked);

        api.up = true;
        clock.now = clock.now.plusSeconds(10);
        assertThat(api.knowsStations(SAN_MARTIN)).isTrue();
        assertThat(api.asked.size()).isGreaterThan(asked);
    }
}
