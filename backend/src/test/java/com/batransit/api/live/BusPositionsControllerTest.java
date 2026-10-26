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
}
