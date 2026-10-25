package com.batransit.api.service;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.FareRequest;
import com.batransit.api.exception.BadRequestException;
import com.batransit.api.repository.FareRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class FareServiceTest {

    private final FareRepository repository = mock(FareRepository.class);
    private final FareService service = new FareService(repository);

    @Test
    void rechazaMinKmMayorOIgualQueMaxKm() {
        FareRequest request = fare(new BigDecimal("12"), new BigDecimal("6"));

        assertThatThrownBy(() -> service.create(request)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void rechazaMaxKmSinMinKm() {
        FareRequest request = fare(null, new BigDecimal("6"));

        assertThatThrownBy(() -> service.create(request)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(repository);
    }

    private static FareRequest fare(BigDecimal minKm, BigDecimal maxKm) {
        return new FareRequest(TransportMode.COLECTIVO, minKm, maxKm, new BigDecimal("700"), LocalDate.of(2026, 10, 1));
    }
}
