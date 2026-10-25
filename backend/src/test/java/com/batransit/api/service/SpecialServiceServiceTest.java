package com.batransit.api.service;

import com.batransit.api.dto.SpecialServiceRequest;
import com.batransit.api.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SpecialServiceServiceTest {

    @Test
    void rechazaUnaFechaDeFinAnteriorALaDeInicio() {
        SpecialServiceService service = new SpecialServiceService(null, null);
        SpecialServiceRequest request = new SpecialServiceRequest(1L, null, "Tren rápido", null, null, null,
                LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 1), null);

        assertThatThrownBy(() -> service.create(request)).isInstanceOf(BadRequestException.class);
    }
}
