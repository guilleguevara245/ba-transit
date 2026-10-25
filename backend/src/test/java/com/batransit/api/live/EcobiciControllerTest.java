package com.batransit.api.live;

import com.batransit.api.live.EcobiciController.Station;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EcobiciControllerTest {

    @Test
    void uneUbicacionYDisponibilidadPorEstacion() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String information = """
                {"data": {"stations": [
                  {"station_id": "2", "name": "002 - Retiro I", "address": "Av. Ramos Mejia 1300",
                   "lat": -34.592, "lon": -58.375, "capacity": 20},
                  {"station_id": "3", "name": "003 - ADUANA", "lat": -34.611, "lon": -58.369, "capacity": 28},
                  {"station_id": "4", "name": "Sin estado", "lat": -34.6, "lon": -58.4, "capacity": 10}]}}
                """;
        String status = """
                {"data": {"stations": [
                  {"station_id": "2", "num_bikes_available": 7, "num_docks_available": 13, "is_renting": 1},
                  {"station_id": "3", "num_bikes_available": 0, "num_docks_available": 0, "is_renting": false,
                   "status": "END_OF_LIFE"}]}}
                """;
        List<Station> stations = EcobiciController.merge(mapper.readTree(information), mapper.readTree(status));

        assertThat(stations).extracting(Station::id).containsExactly("2", "3");
        assertThat(stations.get(0).bikes()).isEqualTo(7);
        assertThat(stations.get(0).renting()).isTrue();
        assertThat(stations.get(1).renting()).isFalse();
    }
}
