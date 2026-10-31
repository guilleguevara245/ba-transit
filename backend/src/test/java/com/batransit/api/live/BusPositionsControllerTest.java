package com.batransit.api.live;

import com.batransit.api.live.BusPositionsController.Vehicle;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BusPositionsControllerTest {

    private static final long NOW = 1_776_129_300L;

    @Test
    void filtraPorLineaYDescartaPosicionesViejasOSinCoordenadas() throws Exception {
        String json = """
                [{"route_id": "764", "latitude": -34.78668, "longitude": -58.249, "timestamp": 1776129272,
                  "id": "1881", "direction": 0, "route_short_name": "159C", "trip_headsign": "a Est. Lanus"},
                 {"route_id": "764", "latitude": -34.7, "longitude": -58.3, "timestamp": 1776120000,
                  "id": "1882", "direction": 1, "trip_headsign": "viejo"},
                 {"route_id": "764", "latitude": 0, "longitude": 0, "timestamp": 1776129290, "id": "1883"},
                 {"route_id": "100", "latitude": -34.6, "longitude": -58.4, "timestamp": 1776129290, "id": "9"}]
                """;
        List<Vehicle> vehicles = BusPositionsController.vehiclesOf(new ObjectMapper().readTree(json), "764", NOW);

        assertThat(vehicles).extracting(Vehicle::id).containsExactly("1881");
        assertThat(vehicles.get(0).headsign()).isEqualTo("a Est. Lanus");
        assertThat(vehicles.get(0).ageSeconds()).isEqualTo(28);
    }

    @Test
    void elMapaGeneralSoloIncluyeLosQueSeMueven() throws Exception {
        String json = """
                [{"route_id": "764", "route_short_name": "159C", "latitude": -34.786681, "longitude": -58.249,
                  "speed": 9.72, "timestamp": 1776129272, "trip_headsign": "a Est. Lanus", "direction": 1},
                 {"route_id": "764", "route_short_name": "159C", "latitude": -34.7, "longitude": -58.3,
                  "speed": 0, "timestamp": 1776129280},
                 {"route_id": "100", "route_short_name": "60A", "latitude": -34.6, "longitude": -58.4,
                  "speed": 5, "timestamp": 1776120000}]
                """;
        List<BusPositionsController.MovingBus> buses =
                BusPositionsController.movingOf(new ObjectMapper().readTree(json), NOW);

        assertThat(buses).hasSize(1);
        assertThat(buses.get(0).line()).isEqualTo("159C");
        assertThat(buses.get(0).latitude()).isEqualTo(-34.78668);
        assertThat(buses.get(0).direction()).isEqualTo(1);
    }

    @Test
    void cuentaLosColectivosEnMovimientoPorLinea() {
        List<BusPositionsController.MovingBus> moving = List.of(
                new BusPositionsController.MovingBus("1", "r1", "152", -34.6, -58.4, "", 0),
                new BusPositionsController.MovingBus("2", "r1", "152", -34.6, -58.4, "", 1),
                new BusPositionsController.MovingBus("3", "r2", "53a", -34.6, -58.4, "", 0),
                new BusPositionsController.MovingBus("4", "r3", "60", -34.6, -58.4, "", 0));
        List<String> wanted = BusPositionsController.parseLines(" 152, 53A,152,raro!, 7 ");
        assertThat(wanted.equals(List.of("152", "53A", "7"))).isEqualTo(true);
        assertThat(BusPositionsController.countByLine(moving, wanted).equals(List.of(
                new BusPositionsController.LineCount("152", 2),
                new BusPositionsController.LineCount("53A", 1),
                new BusPositionsController.LineCount("7", 0)))).isEqualTo(true);
        assertThat(BusPositionsController.parseLines(null).isEmpty()).isEqualTo(true);
    }

    @Test
    void descartaColectivosDeOtraLineaConElMismoId() throws Exception {
        String json = """
                [{"route_id": "500", "latitude": -34.6, "longitude": -58.6, "timestamp": 1776129290, "id": "1",
                  "route_short_name": "303A", "trip_headsign": "A EST. MORÃ³N"},
                 {"route_id": "500", "latitude": -34.7, "longitude": -58.5, "timestamp": 1776129290, "id": "2",
                  "route_short_name": "155"},
                 {"route_id": "500", "latitude": -34.7, "longitude": -58.5, "timestamp": 1776129290, "id": "3"}]
                """;
        var feed = new ObjectMapper().readTree(json);
        List<Vehicle> mine = BusPositionsController.vehiclesOf(feed, "500", "303a", NOW);
        // El de otra linea se descarta; el que no dice linea se conserva.
        assertThat(mine).extracting(Vehicle::id).containsExactly("1", "3");
        assertThat(mine.get(0).headsign()).isEqualTo("A EST. MORÓN");
        // Sin numero, como antes: todos los del id.
        assertThat(BusPositionsController.vehiclesOf(feed, "500", NOW).size()).isEqualTo(3);
    }

    @Test
    void sumaLosDeLaMismaLineaConOtroId() throws Exception {
        String json = """
                [{"route_id": "500", "latitude": -34.6, "longitude": -58.6, "timestamp": 1776129290, "id": "1",
                  "route_short_name": "303A"},
                 {"route_id": "501", "latitude": -34.7, "longitude": -58.5, "timestamp": 1776129290, "id": "2",
                  "route_short_name": "303 a"},
                 {"route_id": "502", "latitude": -34.7, "longitude": -58.5, "timestamp": 1776129290, "id": "3",
                  "route_short_name": "303B"}]
                """;
        var feed = new ObjectMapper().readTree(json);
        List<Vehicle> mine = BusPositionsController.vehiclesOf(feed, "500", "303A", NOW);
        // El 303A de otro ramal se suma marcado; el 303B no.
        assertThat(mine).extracting(Vehicle::id).containsExactly("1", "2");
        assertThat(mine.get(0).otherRoute()).isFalse();
        assertThat(mine.get(1).otherRoute()).isTrue();
        // Sin numero no se puede saber cual es la misma linea: solo los del id.
        assertThat(BusPositionsController.vehiclesOf(feed, "500", NOW)).extracting(Vehicle::id).containsExactly("1");
    }
}
