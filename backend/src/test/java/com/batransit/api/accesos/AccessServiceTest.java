package com.batransit.api.accesos;

import com.batransit.api.accesos.AccessModels.AccessDefinition;
import com.batransit.api.accesos.AccessModels.AccessesResponse;
import com.batransit.api.accesos.AccessModels.DirectionDefinition;
import com.batransit.api.accesos.AccessModels.FlowData;
import com.batransit.api.accesos.AccessModels.SegmentDefinition;
import com.batransit.api.accesos.AccessModels.SegmentReport;
import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class AccessServiceTest {

    private static final List<AccessDefinition> ONE_ACCESS = List.of(new AccessDefinition(
            "norte", "Acceso Norte", "RN 9", "CABA - Tigre", "Autopistas del Sol",
            List.of(new SegmentDefinition("Tramo 1", -34.5, -58.5))));

    /** Cliente falso: no sale a internet y cuenta las consultas. */
    static class FakeClient extends TomTomTrafficClient {
        final AtomicInteger calls = new AtomicInteger();
        private final FlowData data;

        FakeClient(String key, FlowData data) {
            super(key);
            this.data = data;
        }

        @Override
        public Optional<FlowData> flowAt(double lat, double lon) {
            calls.incrementAndGet();
            return Optional.ofNullable(data);
        }
    }

    private static FlowData flow(double current, double free, String frc) {
        return new FlowData(current, free, false, frc, 1, List.of(new double[] {-34.5, -58.5}));
    }

    @Test
    void clasificaSegunLaRelacionDeVelocidades() {
        assertThat(AccessService.classify(flow(90, 100, "FRC0"))).isEqualTo(TrafficStatus.FLUIDO);
        assertThat(AccessService.classify(flow(60, 100, "FRC0"))).isEqualTo(TrafficStatus.DEMORADO);
        assertThat(AccessService.classify(flow(20, 100, "FRC0"))).isEqualTo(TrafficStatus.CONGESTIONADO);
        assertThat(AccessService.classify(new FlowData(0, 100, true, "FRC0", 1, List.of())))
                .isEqualTo(TrafficStatus.CORTADO);
        assertThat(AccessService.classify(flow(10, 0, "FRC0"))).isEqualTo(TrafficStatus.SIN_DATOS);
    }

    @Test
    void sinClaveNoConsultaYDevuelveLaInformacionFija() {
        FakeClient client = new FakeClient("", flow(90, 100, "FRC0"));
        AccessesResponse response = new AccessService(ONE_ACCESS, client, Clock.systemUTC()).report();

        assertThat(response.configured()).isFalse();
        assertThat(response.accesses().get(0).operator()).isEqualTo("Autopistas del Sol");
        assertThat(response.accesses().get(0).segments().get(0).status()).isEqualTo(TrafficStatus.SIN_DATOS);
        assertThat(client.calls).hasValue(0);
    }

    @Test
    void guardaElResultadoVeinteMinutos() {
        FakeClient client = new FakeClient("clave", flow(90, 100, "FRC0"));
        MutableClock clock = new MutableClock(Instant.parse("2026-10-25T12:00:00Z"));
        AccessService service = new AccessService(ONE_ACCESS, client, clock);

        service.report();
        clock.now = clock.now.plusSeconds(19 * 60);
        service.report();
        assertThat(client.calls).hasValue(1);

        clock.now = clock.now.plusSeconds(2 * 60);
        service.report();
        assertThat(client.calls).hasValue(2);
    }

    @Test
    void unTramoQueNoEsAutopistaQuedaParaRevisar() {
        FakeClient client = new FakeClient("clave", flow(30, 40, "FRC5"));
        SegmentReport segment = new AccessService(ONE_ACCESS, client, Clock.systemUTC())
                .report().accesses().get(0).segments().get(0);

        assertThat(segment.status()).isEqualTo(TrafficStatus.SIN_DATOS);
        assertThat(segment.checkLocation()).isTrue();
    }

    @Test
    void distingueLaAutopistaDeUnaCalleCercana() {
        assertThat(AccessService.isHighway(flow(60, 95, "FRC0"))).isTrue();
        assertThat(AccessService.isHighway(flow(90, 98, "FRC3"))).isTrue();
        assertThat(AccessService.isHighway(flow(30, 39, "FRC2"))).isFalse();
        assertThat(AccessService.isHighway(flow(30, 41, "FRC4"))).isFalse();
    }

    @Test
    void siElPuntoCaeEnUnaCalleBuscaLaAutopistaCercaYLaRecuerda() {
        AtomicInteger calls = new AtomicInteger();
        // Solo los puntos al norte del original dan la autopista.
        TomTomTrafficClient client = new TomTomTrafficClient("clave") {
            @Override
            public Optional<FlowData> flowAt(double lat, double lon) {
                calls.incrementAndGet();
                return Optional.of(lat > -34.5 ? flow(80, 100, "FRC0") : flow(30, 39, "FRC4"));
            }
        };
        MutableClock clock = new MutableClock(Instant.parse("2026-10-25T12:00:00Z"));
        AccessService service = new AccessService(ONE_ACCESS, client, clock);

        SegmentReport segment = service.report().accesses().get(0).segments().get(0);
        assertThat(segment.status()).isEqualTo(TrafficStatus.FLUIDO);
        assertThat(segment.checkLocation()).isFalse();
        int firstRound = calls.get();
        assertThat(firstRound).isGreaterThan(1);

        // En la siguiente medicion va directo al punto encontrado.
        clock.now = clock.now.plusSeconds(21 * 60);
        service.report();
        assertThat(calls.get()).isEqualTo(firstRound + 1);
    }

    @Test
    void siNoEncuentraLaAutopistaNoVuelveABuscarHastaElOtroDia() {
        FakeClient client = new FakeClient("clave", flow(30, 39, "FRC4"));
        MutableClock clock = new MutableClock(Instant.parse("2026-10-25T12:00:00Z"));
        AccessService service = new AccessService(ONE_ACCESS, client, clock);

        service.report();
        assertThat(client.calls).hasValue(1 + AccessService.SEARCH_OFFSETS.size());

        clock.now = clock.now.plusSeconds(21 * 60);
        service.report();
        assertThat(client.calls).hasValue(2 + AccessService.SEARCH_OFFSETS.size());
    }

    @Test
    void siTomTomFallaElTramoQuedaSinDatos() {
        FakeClient client = new FakeClient("clave", null);
        SegmentReport segment = new AccessService(ONE_ACCESS, client, Clock.systemUTC())
                .report().accesses().get(0).segments().get(0);

        assertThat(segment.status()).isEqualTo(TrafficStatus.SIN_DATOS);
        assertThat(segment.currentSpeed()).isNull();
    }

    @Test
    void elArchivoDeAccesosTieneLosCuatroConDosTramos() {
        List<AccessDefinition> definitions = AccessService.loadDefinitions(new ObjectMapper());

        assertThat(definitions).extracting(AccessDefinition::id)
                .containsExactly("la-plata", "norte", "oeste", "riccheri");
        assertThat(definitions).allSatisfy(a -> assertThat(a.segments()).hasSize(2));
        // Cada tramo se mide en sus dos manos.
        assertThat(definitions).flatExtracting(AccessDefinition::segments).allSatisfy(s ->
                assertThat(s.directions()).extracting(DirectionDefinition::towards)
                        .containsExactly("CABA", "Provincia"));
    }

    @Test
    void conDosManosElTramoTomaLaMasComplicada() {
        // Hacia Provincia (lat mas al sur en este caso de prueba) esta congestionado.
        TomTomTrafficClient client = new TomTomTrafficClient("clave") {
            @Override
            public Optional<FlowData> flowAt(double lat, double lon) {
                return Optional.of(lat < -34.501 ? flow(25, 90, "FRC0") : flow(88, 90, "FRC0"));
            }
        };
        List<AccessDefinition> access = List.of(new AccessDefinition("norte", "Acceso Norte", "RN 9", "", "",
                List.of(new SegmentDefinition("Tramo 1", -34.5, -58.5, List.of(
                        new DirectionDefinition("CABA", -34.5, -58.5),
                        new DirectionDefinition("Provincia", -34.502, -58.5))))));

        SegmentReport segment = new AccessService(access, client, Clock.systemUTC())
                .report().accesses().get(0).segments().get(0);

        assertThat(segment.status()).isEqualTo(TrafficStatus.CONGESTIONADO);
        assertThat(segment.currentSpeed()).isEqualTo(25);
        assertThat(segment.directions()).extracting(d -> d.towards() + ":" + d.status())
                .containsExactly("CABA:FLUIDO", "Provincia:CONGESTIONADO");
    }

    @Test
    void dosTramosEnElMismoTramoDeTomTomSeMuestranComoUno() {
        // TomTom devuelve el mismo tramo largo para los dos puntos (como en el Acceso Oeste).
        TomTomTrafficClient client = new TomTomTrafficClient("clave") {
            @Override
            public Optional<FlowData> flowAt(double lat, double lon) {
                return Optional.of(new FlowData(68, 92, false, "FRC0", 1,
                        List.of(new double[] {-34.63, -58.53}, new double[] {-34.62, -58.79})));
            }
        };
        List<DirectionDefinition> manos = List.of(new DirectionDefinition("CABA", -34.63, -58.6),
                new DirectionDefinition("Provincia", -34.631, -58.6));
        List<AccessDefinition> access = List.of(new AccessDefinition("oeste", "Acceso Oeste", "RN 7", "", "",
                List.of(new SegmentDefinition("General Paz – Morón", -34.63, -58.6, manos),
                        new SegmentDefinition("Ituzaingó – Moreno", -34.63, -58.7, manos))));

        List<SegmentReport> segments = new AccessService(access, client, Clock.systemUTC())
                .report().accesses().get(0).segments();

        assertThat(segments).extracting(SegmentReport::name).containsExactly("General Paz – Moreno");
    }

    @Test
    void respetaElTopeDiarioDeConsultas() {
        // 300 puntos por medicion: entran dos mediciones (600) y la tercera pasaria el tope.
        List<DirectionDefinition> points = new java.util.ArrayList<>();
        for (int i = 0; i < 300; i++) {
            points.add(new DirectionDefinition(i % 2 == 0 ? "CABA" : "Provincia", -34.5, -58.5));
        }
        List<AccessDefinition> access = List.of(new AccessDefinition("norte", "Acceso Norte", "RN 9", "", "",
                List.of(new SegmentDefinition("Tramo 1", -34.5, -58.5, points))));
        FakeClient client = new FakeClient("clave", flow(80, 90, "FRC0"));
        MutableClock clock = new MutableClock(Instant.parse("2026-10-26T12:00:00Z"));
        AccessService service = new AccessService(access, client, clock);

        service.report();
        clock.now = clock.now.plusSeconds(21 * 60);
        service.report();
        assertThat(client.calls).hasValue(600);

        clock.now = clock.now.plusSeconds(21 * 60);
        AccessesResponse kept = service.report();
        assertThat(client.calls).hasValue(600);
        assertThat(kept.updatedAt()).isEqualTo(Instant.parse("2026-10-26T12:21:00Z"));

        // Al dia siguiente (hora de Buenos Aires) vuelve a medir.
        clock.now = Instant.parse("2026-10-27T04:00:00Z");
        service.report();
        assertThat(client.calls).hasValue(900);
    }

    @Test
    void siUnaManoNoTieneDatosSeUsaLaOtra() {
        TomTomTrafficClient client = new TomTomTrafficClient("clave") {
            @Override
            public Optional<FlowData> flowAt(double lat, double lon) {
                return lat < -34.501 ? Optional.empty() : Optional.of(flow(70, 90, "FRC0"));
            }
        };
        List<AccessDefinition> access = List.of(new AccessDefinition("norte", "Acceso Norte", "RN 9", "", "",
                List.of(new SegmentDefinition("Tramo 1", -34.5, -58.5, List.of(
                        new DirectionDefinition("CABA", -34.5, -58.5),
                        new DirectionDefinition("Provincia", -34.502, -58.5))))));

        SegmentReport segment = new AccessService(access, client, Clock.systemUTC())
                .report().accesses().get(0).segments().get(0);

        assertThat(segment.status()).isEqualTo(TrafficStatus.FLUIDO);
        assertThat(segment.directions().get(1).status()).isEqualTo(TrafficStatus.SIN_DATOS);
    }

    @Test
    void interpretaLaRespuestaDeTomTom() throws Exception {
        String json = """
                {"flowSegmentData":{"frc":"FRC0","currentSpeed":42,"freeFlowSpeed":95,
                 "confidence":0.9,"roadClosure":false,
                 "coordinates":{"coordinate":[{"latitude":-34.7,"longitude":-58.27},
                                              {"latitude":-34.71,"longitude":-58.26}]}}}
                """;
        FlowData data = TomTomTrafficClient.parse(new ObjectMapper().readTree(json));

        assertThat(data.currentSpeed()).isEqualTo(42);
        assertThat(data.freeFlowSpeed()).isEqualTo(95);
        assertThat(data.frc()).isEqualTo("FRC0");
        assertThat(data.geometry()).hasSize(2);
        assertThat(TomTomTrafficClient.parse(new ObjectMapper().readTree("{}"))).isNull();
    }

    static class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

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
}
