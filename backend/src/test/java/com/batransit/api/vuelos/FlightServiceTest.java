package com.batransit.api.vuelos;

import com.batransit.api.vuelos.FlightModels.Flight;
import com.batransit.api.vuelos.FlightModels.FlightsResponse;
import com.batransit.api.vuelos.FlightModels.Phase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class FlightServiceTest {

    /**
     * Respuesta de adsb.lol (formato readsb) con los aviones que habia sobre
     * Buenos Aires el 29/10/2026 a las 17:41: altura en pies o "ground",
     * velocidad en nudos, velocidad vertical en pies por minuto.
     */
    static final String SAMPLE = """
            {"now":1793306475000,"total":9,"ac":[
             {"hex":"e0b198","flight":"JES3331 ","r":"LV-HVT","t":"A320","alt_baro":"ground","gs":0,"track":33.75,"lat":-34.5573,"lon":-58.4136,"seen_pos":300},
             {"hex":"a88cde","flight":"N650BL  ","r":"N650BL","t":"C56X","alt_baro":10025,"alt_geom":10325,"gs":276.2,"track":24.15,"baro_rate":-1024,"lat":-34.705,"lon":-58.8676,"seen_pos":0.5},
             {"hex":"e06541","flight":"ARG1477 ","r":"LV-GKO","t":"B738","alt_baro":1875,"alt_geom":2050,"gs":145.3,"track":124.35,"baro_rate":-640,"lat":-34.498,"lon":-58.5253,"seen_pos":1.1},
             {"hex":"e80461","flight":"LPE2381 ","alt_baro":"ground","gs":0,"track":289.69,"lat":-34.5576,"lon":-58.4144,"seen_pos":2},
             {"hex":"345109","flight":"IBE5107 ","r":"EC-NCX","t":"A359","alt_baro":825,"alt_geom":1000,"gs":142,"track":101.78,"geom_rate":-768,"lat":-34.8103,"lon":-58.6027,"seen_pos":0.2},
             {"hex":"e200a4","flight":"LVS100  ","alt_baro":2000,"alt_geom":2100,"gs":78.5,"track":96.58,"baro_rate":-64,"lat":-34.704,"lon":-58.9537,"seen_pos":13},
             {"hex":"e80632","flight":"JES3791 ","alt_baro":"ground","gs":7,"track":329.06,"lat":-34.5564,"lon":-58.4174,"seen_pos":0.4},
             {"hex":"dead00","flight":"OLD1","alt_baro":3000,"gs":150,"lat":-34.6,"lon":-58.5,"seen_pos":300},
             {"hex":"dead01","flight":"SINPOS"}
            ]}""";

    private static JsonNode sample() throws Exception {
        return new ObjectMapper().readTree(SAMPLE);
    }

    @Test
    void parseClasificaCadaAvion() throws Exception {
        List<Flight> flights = FlightService.parse(sample());

        // Sin posicion o con una posicion vieja no se muestran (en tierra se
        // acepta mas vieja: JES3331 informo hace 5 minutos, estacionado).
        assertThat(flights).extracting(Flight::id).doesNotContain("dead00", "dead01");
        assertThat(flights).hasSize(7);

        Flight iberia = byCallsign(flights, "IBE5107");
        assertThat(iberia.phase()).isEqualTo(Phase.LANDING);
        assertThat(iberia.airport()).isEqualTo("EZE");
        assertThat(iberia.airline()).isEqualTo("Iberia");
        assertThat(iberia.altitude()).isEqualTo(305.0); // 1000 pies (altitud geometrica)
        assertThat(iberia.speed()).isEqualTo(263.0); // 142 nudos
        assertThat(iberia.registration()).isEqualTo("EC-NCX");
        assertThat(iberia.aircraftType()).isEqualTo("A359");

        Flight aerolineas = byCallsign(flights, "ARG1477");
        assertThat(aerolineas.phase()).isEqualTo(Phase.LANDING);
        assertThat(aerolineas.airport()).isEqualTo("AEP");

        Flight jetsmart = byCallsign(flights, "JES3331");
        assertThat(jetsmart.phase()).isEqualTo(Phase.GROUND);
        assertThat(jetsmart.airport()).isEqualTo("AEP");
        assertThat(jetsmart.altitude()).isNull();

        // Matricula privada (N650BL): sin aerolinea; a 3000 m va de paso.
        Flight privado = byCallsign(flights, "N650BL");
        assertThat(privado.airline()).isNull();
        assertThat(privado.phase()).isEqualTo(Phase.CRUISE);

        // Primero los que llegan, despues los que salen, en tierra, cerca y de paso.
        assertThat(flights.get(0).phase()).isEqualTo(Phase.LANDING);
        assertThat(flights.get(flights.size() - 1).phase()).isEqualTo(Phase.CRUISE);
    }

    @Test
    void despegandoYCerca() {
        assertThat(FlightService.classify(-34.80, -58.50, false, 900.0, 8.0).phase()).isEqualTo(Phase.DEPARTING);
        assertThat(FlightService.classify(-34.80, -58.50, false, 900.0, 0.0).phase()).isEqualTo(Phase.NEAR);
        assertThat(FlightService.classify(-34.80, -58.50, false, null, -5.0).phase()).isEqualTo(Phase.CRUISE);
    }

    @Test
    void aerolineaSoloConIndicativoDeVuelo() {
        assertThat(FlightService.airline("ARG1477")).isEqualTo("Aerolíneas Argentinas");
        assertThat(FlightService.airline("FBZ5020")).isEqualTo("Flybondi");
        assertThat(FlightService.airline("LVS100")).isNull(); // matricula LV-S100
        assertThat(FlightService.airline("XYZ123")).isNull();
        assertThat(FlightService.airline(null)).isNull();
    }

    /** Cliente falso: devuelve la muestra y cuenta los pedidos. */
    static class FakeClient extends AdsbLolClient {
        final AtomicInteger calls = new AtomicInteger();
        boolean fail;

        @Override
        public Optional<JsonNode> aircraft() {
            calls.incrementAndGet();
            try {
                return fail ? Optional.empty() : Optional.of(sample());
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }
    }

    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-29T20:41:15Z");

        @Override
        public ZoneId getZone() {
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

    @Test
    void guardaElDato30Segundos() {
        MutableClock clock = new MutableClock();
        FakeClient client = new FakeClient();
        FlightService service = new FlightService(client, clock, Runnable::run);

        FlightsResponse first = service.flights();
        assertThat(first.flights()).hasSize(7);
        assertThat(first.refreshSeconds()).isEqualTo(30);
        clock.now = clock.now.plusSeconds(20);
        service.flights();
        assertThat(client.calls).hasValue(1);
        clock.now = clock.now.plusSeconds(11);
        service.flights();
        assertThat(client.calls).hasValue(2);
    }

    @Test
    void siFallaMuestraLoUltimoYEspera() {
        MutableClock clock = new MutableClock();
        FakeClient client = new FakeClient();
        FlightService service = new FlightService(client, clock, Runnable::run);
        Instant firstAt = service.flights().updatedAt();

        client.fail = true;
        clock.now = clock.now.plusSeconds(31);
        FlightsResponse afterFailure = service.flights();
        assertThat(afterFailure.flights()).hasSize(7);
        assertThat(afterFailure.updatedAt()).isEqualTo(firstAt);

        // Tras la falla espera 2 minutos antes de volver a intentar.
        clock.now = clock.now.plusSeconds(60);
        service.flights();
        assertThat(client.calls).hasValue(2);
        clock.now = clock.now.plusSeconds(61);
        service.flights();
        assertThat(client.calls).hasValue(3);
    }

    @Test
    void elPedidoNoFrenaLaRespuesta() {
        // Con un executor que todavia no corrio el pedido: responde enseguida, sin datos, y no pide dos veces.
        java.util.List<Runnable> pending = new java.util.ArrayList<>();
        FakeClient client = new FakeClient();
        FlightService service = new FlightService(client, new MutableClock(), pending::add);
        assertThat(service.flights().updatedAt()).isNull();
        service.flights();
        assertThat(pending).hasSize(1);
        pending.get(0).run();
        assertThat(service.flights().flights()).hasSize(7);
    }

    @Test
    void sinDatosTodaviaDevuelveListaVacia() {
        FakeClient client = new FakeClient();
        client.fail = true;
        FlightsResponse response = new FlightService(client, new MutableClock(), Runnable::run).flights();
        assertThat(response.flights()).isEmpty();
        assertThat(response.updatedAt()).isNull();
    }

    private static Flight byCallsign(List<Flight> flights, String callsign) {
        return flights.stream().filter(f -> callsign.equals(f.callsign())).findFirst().orElseThrow();
    }
}
