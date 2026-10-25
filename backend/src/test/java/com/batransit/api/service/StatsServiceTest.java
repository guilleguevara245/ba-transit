package com.batransit.api.service;

import com.batransit.api.domain.AlertType;
import com.batransit.api.dto.LineAlertCountRow;
import com.batransit.api.dto.LineAlertStats;
import com.batransit.api.dto.LineTypeCountRow;
import com.batransit.api.repository.AlertRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StatsServiceTest {

    @Test
    void combinaConteosConElTipoMasFrecuentePorLinea() {
        AlertRepository repository = mock(AlertRepository.class);
        when(repository.countByLine()).thenReturn(List.of(
                new LineAlertCountRow(1L, "Línea A", "#00A8E1", 5L, 1L),
                new LineAlertCountRow(2L, "Línea B", "#EE1C25", 2L, 0L)));
        when(repository.countByLineAndType()).thenReturn(List.of(
                new LineTypeCountRow(1L, AlertType.DEMORA, 1L),
                new LineTypeCountRow(1L, AlertType.INTERRUPCION, 4L),
                new LineTypeCountRow(2L, AlertType.OBRA, 2L)));

        List<LineAlertStats> stats = new StatsService(repository).alertStatsByLine();

        assertThat(stats).containsExactly(
                new LineAlertStats(1L, "Línea A", "#00A8E1", 5L, 1L, "INTERRUPCION"),
                new LineAlertStats(2L, "Línea B", "#EE1C25", 2L, 0L, "OBRA"));
    }

    @Test
    void sinAlertasDevuelveListaVacia() {
        AlertRepository repository = mock(AlertRepository.class);
        when(repository.countByLine()).thenReturn(List.of());
        when(repository.countByLineAndType()).thenReturn(List.of());

        assertThat(new StatsService(repository).alertStatsByLine()).isEmpty();
    }
}
