package com.batransit.api.repository;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.MapStation;
import com.batransit.api.dto.StationSearchResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Corre las consultas reales contra PostgreSQL con todas las
 * migraciones de Flyway aplicadas (la misma base que usa el CI), para
 * verificar los JPQL y los datos semilla. Requiere el Postgres de
 * docker-compose levantado, igual que BaTransitApplicationTests.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RepositoryIntegrationTest {

    @Autowired
    private StationRepository stationRepository;

    @Autowired
    private TransportLineRepository lineRepository;

    @Autowired
    private FareRepository fareRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Test
    void laBusquedaDeEstacionesNoDistingueTildes() {
        List<StationSearchResult> results = stationRepository.search("%peru%", PageRequest.of(0, 20));

        assertThat(results).extracting(StationSearchResult::stationName).contains("Perú");
    }

    @Test
    void laBusquedaRespetaElLimite() {
        assertThat(stationRepository.search("%a%", PageRequest.of(0, 5))).hasSize(5);
    }

    @Test
    void laBusquedaDeLineasEncuentraPorNombre() {
        assertThat(lineRepository.search("%roca%", PageRequest.of(0, 20)))
                .extracting(line -> line.getMode())
                .containsOnly(TransportMode.TREN);
    }

    @Test
    void elMapaDeSubteTieneLas90EstacionesConCoordenadas() {
        List<MapStation> stations = stationRepository.findMapStationsByMode(TransportMode.SUBTE);

        assertThat(stations).hasSize(90);
        assertThat(stations).allSatisfy(s -> {
            assertThat(s.latitude()).isNotNull();
            assertThat(s.longitude()).isNotNull();
        });
    }

    @Test
    void elMapaCompletoIncluyeTodosLosModosConCoordenadas() {
        List<MapStation> all = stationRepository.findAllMapStations();

        assertThat(all).hasSizeGreaterThanOrEqualTo(90);
        assertThat(all).extracting(MapStation::lineMode).contains(TransportMode.SUBTE);
    }

    @Test
    void lasLineasSeFiltranPorModo() {
        assertThat(lineRepository.findByModeOrderByCodeAsc(TransportMode.SUBTE))
                .extracting(line -> line.getCode())
                .containsExactly("A", "B", "C", "D", "E", "H");
    }

    @Test
    void hayTarifasVigentesCargadas() {
        assertThat(fareRepository.findByActiveTrueOrderByModeAscMinKmAsc()).isNotEmpty();
        assertThat(fareRepository.findByModeAndActiveTrueOrderByMinKmAsc(TransportMode.COLECTIVO)).isNotEmpty();
    }

    @Test
    void lasConsultasDeEstadisticasCorren() {
        // Solo verifica que el JPQL sea valido contra el esquema real.
        assertThat(alertRepository.countByLine()).isNotNull();
        assertThat(alertRepository.countByLineAndType()).isNotNull();
    }
}
