package com.batransit.api.colectivos;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Textos doblemente codificados del feed de colectivos. */
class TextRepairTest {

    @Test
    void arreglaLoDoblementeCodificado() {
        assertThat(TextRepair.fix("A EST. MORÃ³N")).isEqualTo("A EST. MORÓN");
        assertThat(TextRepair.fix("Estación Constitución")).isEqualTo("Estación Constitución");
        assertThat(TextRepair.fix("EstaciÃ³n ConstituciÃ³n")).isEqualTo("Estación Constitución");
        assertThat(TextRepair.fix("CAÃ‘UELAS")).isEqualTo("CAÑUELAS");
        assertThat(TextRepair.fix("Pte. PerÃ³n")).isEqualTo("Pte. Perón");
    }

    @Test
    void loQueNoSePuedeArreglarQuedaIgual() {
        assertThat(TextRepair.fix(null)).isEqualTo(null);
        assertThat(TextRepair.fix("")).isEqualTo("");
        assertThat(TextRepair.fix("MORON")).isEqualTo("MORON");
        // Una "Ã" de verdad (no es un arreglo posible): queda como vino.
        assertThat(TextRepair.fix("SÃO PAULO")).isEqualTo("SÃO PAULO");
    }
}
