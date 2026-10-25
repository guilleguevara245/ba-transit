package com.batransit.api.domain;

import com.batransit.api.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransportModeTest {

    @Test
    void noDistingueMayusculasNiEspacios() {
        assertThat(TransportMode.from("subte")).isEqualTo(TransportMode.SUBTE);
        assertThat(TransportMode.from(" Tren ")).isEqualTo(TransportMode.TREN);
    }

    @Test
    void unValorInvalidoListaLosValidos() {
        assertThatThrownBy(() -> TransportMode.from("subtee"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("SUBTE, TREN");
        assertThatThrownBy(() -> TransportMode.from(null)).isInstanceOf(BadRequestException.class);
    }
}
