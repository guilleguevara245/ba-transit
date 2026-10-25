package com.batransit.api.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class SpecialServiceTest {

    private static SpecialService service(LocalDate from, LocalDate until) {
        return new SpecialService(null, "Tren rápido", null, "Lunes a viernes", "17:30 y 18:30", from, until);
    }

    @Test
    void estaVigenteSoloDentroDeSusFechas() {
        SpecialService s = service(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30));

        assertThat(s.isValidOn(LocalDate.of(2026, 10, 31))).isFalse();
        assertThat(s.isValidOn(LocalDate.of(2026, 11, 1))).isTrue();
        assertThat(s.isValidOn(LocalDate.of(2026, 11, 30))).isTrue();
        assertThat(s.isValidOn(LocalDate.of(2026, 12, 1))).isFalse();
    }

    @Test
    void sinFechaDeFinSigueVigenteHastaQueSeDaDeBaja() {
        SpecialService s = service(LocalDate.of(2026, 11, 1), null);

        assertThat(s.isValidOn(LocalDate.of(2030, 1, 1))).isTrue();
        s.deactivate();
        assertThat(s.isValidOn(LocalDate.of(2026, 11, 2))).isFalse();
    }
}
