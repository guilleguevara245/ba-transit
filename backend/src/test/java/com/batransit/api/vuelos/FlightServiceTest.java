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

    /** Respuesta real de OpenSky para el recuadro de Buenos Aires (29/10/2026, 17:41), recortada. */
    static final String SAMPLE = """
            {"time":1793306475,"states":[
             ["e0b198","JES3331 ","Argentina",1793306164,1793306164,-58.4136,-34.5573,null,true,0,33.75,null,null,null,"2034",false,0],
             ["a88cde","N650BL  ","United States",1793306475,1793306475,-58.8676,-34.705,3055.62,false,142.08,24.15,-5.2,null,3147.06,"1716",false,0],
             ["e06541","ARG1477 ","Argentina",1793306474,1793306474,-58.5253,-34.498,571.5,false,74.77,124.35,-3.25,null,624.84,"2361",false,0],
             ["e80461","LPE2381 ","Chile",1793306473,1793306473,-58.4144,-34.5576,null,true,0,289.69,null,null,null,null,false,0],
             ["345109","IBE5107 ","Spain",1793306473,1793306473,-58.6027,-34.8103,251.46,false,73.05,101.78,-3.9,null,304.8,"2376",false,0],
             ["e200a4","LVS100  ","Argentina",1793306462,1793306462,-58.9537,-34.704,609.6,false,40.39,96.58,-0.33,null,640.08,"2000",false,0],
             ["e80632","JES3791 ","Chile",1793306475,1793306475,-58.4174,-34.5564,null,true,3.6,329.06,null,null,null,"7114",false,0],
             ["dead00","OLD1    ","Argentina",1793300000,1793300000,-58.5,-34.6,1000,false,80,90,0,null,1000,null,false,0],
             ["dead01",null,"Argentina",null,1793306475,null,null,null,false,null,null,null,null,null,null,false,0]
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
        assertThat(iberia.altitude()).isEqualTo(305.0); // altitud geometrica
        assertThat(iberia.speed()).isEqualTo(263.0); // 73,05 m/s

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
    static class FakeClient extends OpenSkyClient {
        final AtomicInteger calls = new AtomicInteger();
        boolean fail;
        final boolean registered;

        FakeClient(boolean registered) {
            super("", "");
            this.registered = registered;
        }

        @Override
        public boolean isRegistered() {
            return registered;
        }

        @Override
        public Optional<JsonNode> states() {
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
    void guardaElDatoSegunHayaCuentaONo() {
        MutableClock clock = new MutableClock();
        FakeClient anonymous = new FakeClient(false);
        FlightService service = new FlightService(anonymous, clock);

        FlightsResponse first = service.flights();
        assertThat(first.flights()).hasSize(7);
        assertThat(first.refreshSeconds()).isEqualTo(300);
        clock.now = clock.now.plus(Duration.ofMinutes(4));
        service.flights();
        assertThat(anonymous.calls).hasValue(1);
        clock.now = clock.now.plus(Duration.ofMinutes(1));
        service.flights();
        assertThat(anonymous.calls).hasValue(2);

        FakeClient registered = new FakeClient(true);
        FlightService withAccount = new FlightService(registered, clock);
        withAccount.flights();
        clock.now = clock.now.plusSeconds(31);
        assertThat(withAccount.flights().refreshSeconds()).isEqualTo(30);
        assertThat(registered.calls).hasValue(2);
    }

    @Test
    void siFallaMuestraLoUltimoYEspera() {
        MutableClock clock = new MutableClock();
        FakeClient client = new FakeClient(true);
        FlightService service = new FlightService(client, clock);
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
    void sinDatosTodaviaDevuelveListaVacia() {
        FakeClient client = new FakeClient(false);
        client.fail = true;
        FlightsResponse response = new FlightService(client, new MutableClock()).flights();
        assertThat(response.flights()).isEmpty();
        assertThat(response.updatedAt()).isNull();
    }

    private static Flight byCallsign(List<Flight> flights, String callsign) {
        return flights.stream().filter(f -> callsign.equals(f.callsign())).findFirst().orElseThrow();
    }
}
