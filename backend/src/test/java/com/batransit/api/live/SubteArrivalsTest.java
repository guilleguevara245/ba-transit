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

    @Test
    void ubicaLosTrenesAndandoEntreDosEstaciones() throws Exception {
        List<SubteArrivals.Place> places = List.of(
                new SubteArrivals.Place("Congreso de Tucumán", -34.5550, -58.4620),
                new SubteArrivals.Place("Juramento", -34.5620, -58.4560),
                new SubteArrivals.Place("Bulnes", -34.5880, -58.4110),
                new SubteArrivals.Place("Catedral", -34.6080, -58.3740));

        List<SubteArrivals.Position> trains = SubteArrivals.positions(new ObjectMapper().readTree(FEED), "D", places, NOW);

        // Tren 1: salio de Juramento hace 100 s y llega a Bulnes en 180 s (100/280 del tramo).
        // Tren 2: todavia no salio (faltan 5 min). Tren 3: entre Bulnes y Congreso de Tucuman.
        assertThat(trains).extracting(SubteArrivals.Position::id).containsExactly("1", "3");
        SubteArrivals.Position first = trains.get(0);
        assertThat(first.nextStation()).isEqualTo("Bulnes");
        assertThat(first.destination()).isEqualTo("Catedral");
        assertThat(first.minutesToNext()).isEqualTo(3);
        assertThat(first.latitude()).isEqualTo(-34.5620 + (-34.5880 + 34.5620) * 100 / 280.0);
        assertThat(trains.get(1).nextStation()).isEqualTo("Congreso de Tucumán");
    }

    @Test
    void siElPronosticoTraeSoloLasQueFaltanVieneDeLaAnteriorDeLaLinea() throws Exception {
        String feed = """
                {"Header": {"timestamp": %d}, "Entity": [
                  {"ID": "9", "Linea": {"Route_Id": "LineaD", "Direction_ID": 1, "Estaciones": [
                    {"stop_name": "Bulnes", "arrival": {"time": %d}},
                    {"stop_name": "Catedral", "arrival": {"time": %d}}]}}]}
                """.formatted(NOW, NOW + 55, NOW + 700);
        List<SubteArrivals.Place> places = List.of(
                new SubteArrivals.Place("Juramento", -34.5620, -58.4560, 1),
                new SubteArrivals.Place("Bulnes", -34.5880, -58.4110, 2),
                new SubteArrivals.Place("Catedral", -34.6080, -58.3740, 3));

        List<SubteArrivals.Position> trains = SubteArrivals.positions(new ObjectMapper().readTree(feed), "D", places, NOW);

        // Le faltan 55 s para Bulnes: viene de Juramento, a la mitad del tramo (110 s por estacion).
        assertThat(trains).hasSize(1);
        assertThat(trains.get(0).nextStation()).isEqualTo("Bulnes");
        assertThat(trains.get(0).latitude()).isEqualTo(-34.5620 + (-34.5880 + 34.5620) * 0.5);
    }

    @Test
    void lasLineasConTrenesSonLasQueTienenAlgunaHoraCercaDeAhora() throws Exception {
        assertThat(SubteArrivals.linesWithTrains(new ObjectMapper().readTree(FEED), NOW)).containsExactly("B", "D");
        // Tres horas despues ya no queda ningun tren del pronostico.
        assertThat(SubteArrivals.linesWithTrains(new ObjectMapper().readTree(FEED), NOW + 3 * 3600)).isEmpty();
        assertThat(SubteArrivals.linesWithTrains(new ObjectMapper().readTree("{\"Entity\": []}"), NOW)).isEmpty();
    }
}
