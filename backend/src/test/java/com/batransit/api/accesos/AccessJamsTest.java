package com.batransit.api.accesos;

import com.batransit.api.accesos.AccessModels.AccessDefinition;
import com.batransit.api.accesos.AccessModels.DirectionDefinition;
import com.batransit.api.accesos.AccessModels.DirectionReport;
import com.batransit.api.accesos.AccessModels.Incident;
import com.batransit.api.accesos.AccessModels.IncidentCheck;
import com.batransit.api.accesos.AccessModels.Jam;
import com.batransit.api.accesos.AccessModels.SegmentDefinition;
import com.batransit.api.accesos.AccessModels.SegmentReport;
import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AccessJamsTest {

    private static final AccessDefinition NORTE = new AccessDefinition(
            "norte", "Acceso Norte (Panamericana)", "RN 9", "CABA - Pilar", "Autopistas del Sol",
            List.of(new SegmentDefinition("General Paz – Márquez", -34.518, -58.51, List.of(
                            new DirectionDefinition("CABA", -34.520466, -58.51364),
                            new DirectionDefinition("Provincia", -34.520341, -58.513432))),
                    new SegmentDefinition("Ramal Pilar", -34.45, -58.77, List.of(
                            new DirectionDefinition("CABA", -34.443393, -58.768377),
                            new DirectionDefinition("Provincia", -34.443264, -58.768237)))),
            List.of("RN9", "RN8"));

    /** Un embotellamiento de ~2 km en Panamericana a la altura de Márquez, en el sentido de los puntos. */
    private static Incident jam(List<String> roads, double[]... points) {
        return new Incident(6, 2, "Márquez", "Paraná", 2400, 480, roads, List.of(points));
    }

    @Test
    void asignaElEmbotellamientoALaManoQueSeAcercaACaba() {
        List<IncidentCheck> checks = new ArrayList<>();
        // De Boulogne hacia la General Paz: se acerca al centro.
        Map<String, List<Jam>> jams = AccessService.assignJams(List.of(NORTE),
                List.of(jam(List.of("RN-9"), new double[] {-34.505, -58.535}, new double[] {-34.515, -58.515},
                        new double[] {-34.525, -58.498})), checks);

        assertThat(jams).containsOnlyKeys("norte|General Paz – Márquez|CABA");
        assertThat(checks.get(0).access()).isEqualTo("norte");
        assertThat(checks.get(0).towards()).isEqualTo("CABA");
    }

    @Test
    void elQueSeAlejaDelCentroEsHaciaProvinciaYElDelRamalVaAlRamal() {
        Map<String, List<Jam>> jams = AccessService.assignJams(List.of(NORTE), List.of(
                jam(List.of("RN 9"), new double[] {-34.525, -58.498}, new double[] {-34.505, -58.535}),
                jam(List.of("RN8"), new double[] {-34.46, -58.73}, new double[] {-34.44, -58.78})), new ArrayList<>());

        assertThat(jams).containsOnlyKeys("norte|General Paz – Márquez|Provincia", "norte|Ramal Pilar|Provincia");
    }

    @Test
    void ignoraOtrasRutasLosChicosYLosLejanos() {
        List<IncidentCheck> checks = new ArrayList<>();
        Map<String, List<Jam>> jams = AccessService.assignJams(List.of(NORTE), List.of(
                // Una colectora o una calle cercana: otra ruta.
                jam(List.of(), new double[] {-34.505, -58.535}, new double[] {-34.525, -58.498}),
                // Muy corto.
                new Incident(6, 1, "a", "b", 200, 120, List.of("RN9"),
                        List.of(new double[] {-34.505, -58.535}, new double[] {-34.507, -58.532})),
                // La RN 9 pasando Campana, lejos de los tramos.
                jam(List.of("RN9"), new double[] {-34.20, -58.95}, new double[] {-34.22, -58.93})), checks);

        assertThat(jams).isEmpty();
        assertThat(checks).hasSize(3);
        assertThat(checks.get(0).access()).isNull();
    }

    @Test
    void unEmbotellamientoGraveDejaLaManoCongestionadaAunqueElPuntoEsteLibre() {
        SegmentReport measured = new SegmentReport("General Paz – Márquez", TrafficStatus.FLUIDO, 95, 100, false,
                List.of(), List.of(
                        new DirectionReport("CABA", TrafficStatus.FLUIDO, 95, 100, List.of()),
                        new DirectionReport("Provincia", TrafficStatus.FLUIDO, 98, 100, List.of())));
        Jam grave = new Jam(3000, 900, "Márquez", "Paraná", 3);

        SegmentReport result = AccessService.withJams(measured, "norte",
                Map.of("norte|General Paz – Márquez|CABA", List.of(grave)));

        assertThat(result.status()).isEqualTo(TrafficStatus.CONGESTIONADO);
        assertThat(result.directions().get(0).status()).isEqualTo(TrafficStatus.CONGESTIONADO);
        assertThat(result.directions().get(0).jams()).containsExactly(grave);
        assertThat(result.directions().get(1).status()).isEqualTo(TrafficStatus.FLUIDO);
    }

    @Test
    void leeLaRespuestaDeIncidentDetails() throws Exception {
        String json = """
                {"incidents": [{"type": "Feature",
                  "geometry": {"type": "LineString", "coordinates": [[-58.535, -34.505], [-58.498, -34.525]]},
                  "properties": {"iconCategory": 6, "magnitudeOfDelay": 2, "from": "Márquez", "to": "Paraná",
                                 "length": 2412.7, "delay": 481, "roadNumbers": ["RN9"]}}]}
                """;
        List<Incident> incidents = TomTomTrafficClient.parseIncidents(new ObjectMapper().readTree(json));

        assertThat(incidents).hasSize(1);
        Incident i = incidents.get(0);
        assertThat(i.category()).isEqualTo(6);
        assertThat(i.lengthMeters()).isEqualTo(2413);
        assertThat(i.delaySeconds()).isEqualTo(481);
        assertThat(i.roadNumbers()).containsExactly("RN9");
        // Quedan como [lat, lon].
        assertThat(i.geometry().get(0)[0]).isEqualTo(-34.505);
        assertThat(i.geometry().get(0)[1]).isEqualTo(-58.535);
    }
}
