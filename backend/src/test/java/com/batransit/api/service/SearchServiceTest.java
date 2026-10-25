package com.batransit.api.service;

import com.batransit.api.dto.SearchResponse;
import com.batransit.api.repository.StationRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SearchServiceTest {

    private final TransportLineRepository lineRepository = mock(TransportLineRepository.class);
    private final StationRepository stationRepository = mock(StationRepository.class);
    private final SearchService service = new SearchService(lineRepository, stationRepository);

    @Test
    void normalizaTildesMayusculasYEspacios() {
        assertThat(SearchService.normalize("  Sáenz   PEÑA ")).isEqualTo("saenz pena");
        assertThat(SearchService.normalize("Pueyrredón")).isEqualTo("pueyrredon");
        assertThat(SearchService.normalize(null)).isEmpty();
    }

    @Test
    void escapaLosComodinesDeLike() {
        assertThat(SearchService.escapeLike("50%_off!")).isEqualTo("50!%!_off!!");
    }

    @Test
    void consultasMuyCortasNoVanALaBase() {
        SearchResponse response = service.search(" a ");

        assertThat(response.lines()).isEmpty();
        assertThat(response.stations()).isEmpty();
        verifyNoInteractions(lineRepository, stationRepository);
    }

    @Test
    void buscaConElPatronNormalizado() {
        when(lineRepository.search(any(), any(Pageable.class))).thenReturn(List.of());
        when(stationRepository.search(any(), any(Pageable.class))).thenReturn(List.of());

        service.search("Perú");

        verify(stationRepository).search(eq("%peru%"), any(Pageable.class));
        verify(lineRepository).search(eq("%peru%"), any(Pageable.class));
    }
}
