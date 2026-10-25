package com.batransit.api.live;

import com.batransit.api.live.SubteArrivals.Direction;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SubteArrivalsTest {

    private static final long NOW = 1_800_000_000L;

    private static final String FEED = """
            {"Header": {"timestamp": %d},
             "Entity": [
               {"ID": "1", "Linea": {"Route_Id": "LineaD", "Direction_ID": 1, "Estaciones": [
                 {"stop_name": "Juramento", "arrival": {"time": %d}},
                 {"stop_name": "Bulnes", "arrival": {"time": %d}},
                 {"stop_name": "Catedral", "arrival": {"time": %d}}]}},
               {"ID": "2", "Linea": {"Route_Id": "LineaD", "Direction_ID": 1, "Estaciones": [
                 {"stop_name": "Juramento", "arrival": {"time": %d}},
                 {"stop_name": "Bulnes", "arrival": {"time": 0}},
                 {"stop_name": "Catedral", "arrival": {"time": %d}}]}},
               {"ID": "3", "Linea": {"Route_Id": "LineaD", "Direction_ID": 0, "Estaciones": [
                 {"stop_name": "Catedral", "arrival": {"time": %d}},
                 {"stop_name": "Bulnes", "arrival": {"time": %d}},
                 {"stop_name": "Congreso de Tucumán", "arrival": {"time": %d}}]}},
               {"ID": "4", "Linea": {"Route_Id": "LineaB", "Direction_ID": 0, "Estaciones": [
                 {"stop_name": "Pasteur - AMIA", "arrival": {"time": %d}}]}}
             ]}
            """.formatted(NOW, NOW - 100, NOW + 180, NOW + 900, NOW + 300, NOW + 1500,
            NOW - 600, NOW - 60, NOW + 600, NOW + 240);

    private static List<Direction> compute(String line, String station) throws Exception {
        return SubteArrivals.compute(new ObjectMapper().readTree(FEED), line, station, NOW);
    }

    @Test
    void ordenaPorSentidoYDescartaTrenesQueYaPasaron() throws Exception {
        List<Direction> directions = compute("D", "Bulnes");

        // Sentido 0: el unico tren ya paso por Bulnes.
        assertThat(directions).extracting(Direction::directionId).containsExactly(1);
        Direction haciaCatedral = directions.get(0);
        assertThat(haciaCatedral.towards()).isEqualTo("Catedral");
        assertThat(haciaCatedral.arrivals()).extracting(SubteArrivals.Arrival::minutes).containsExactly(3, 15);
    }

    @Test
    void interpolaLasParadasSinPronostico() throws Exception {
        Direction haciaCatedral = compute("D", "Bulnes").get(0);

        // Tren 2: Juramento +300 s y Catedral +1500 s -> Bulnes a mitad de camino (+900 s = 15 min).
        assertThat(haciaCatedral.arrivals().get(1).estimated()).isTrue();
        assertThat(haciaCatedral.arrivals().get(0).estimated()).isFalse();
    }

    @Test
    void encuentraLaEstacionAunqueElNombreDifiera() throws Exception {
        assertThat(compute("B", "Pasteur").get(0).arrivals()).extracting(SubteArrivals.Arrival::minutes)
                .containsExactly(4);
        assertThat(compute("A", "Bulnes")).isEmpty();
    }
}
