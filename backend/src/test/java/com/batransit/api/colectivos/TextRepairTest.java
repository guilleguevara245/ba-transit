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
    void arreglaLasMayusculasLeidasComoIso() {
        // UTF-8 leido como ISO-8859-1: el segundo byte de "Ñ", "Ó"... es un caracter de control.
        assertThat(TextRepair.fix("CAÃ\u0091UELAS")).isEqualTo("CAÑUELAS");
        assertThat(TextRepair.fix("AV. PEÃ\u0091A Y MORÃ\u0093N")).isEqualTo("AV. PEÑA Y MORÓN");
    }

    @Test
    void loQueNoSePuedeArreglarQuedaIgual() {
        assertThat(TextRepair.fix(null)).isEqualTo(null);
        assertThat(TextRepair.fix("")).isEqualTo("");
        assertThat(TextRepair.fix("MORON")).isEqualTo("MORON");
        // Una "Ã" de verdad (no es un arreglo posible): queda como vino.
        assertThat(TextRepair.fix("SÃO PAULO")).isEqualTo("SÃO PAULO");
    }

    @Test
    void reconoceLasLetrasPerdidas() {
        assertThat(TextRepair.lostLetters("893 MU?ECAS")).isTrue();
        assertThat(TextRepair.lostLetters("2012 CASTA\uFFFDEDA")).isTrue();
        assertThat(TextRepair.lostLetters("1285 HUMBERTO 1?")).isTrue();
        assertThat(TextRepair.lostLetters("893 MUÑECAS")).isFalse();
        assertThat(TextRepair.lostLetters("¿Viene?")).isFalse();
        assertThat(TextRepair.lostLetters(null)).isFalse();
    }

    @Test
    void adivinaLasLetrasQueElFeedTraeComoSignoDePregunta() {
        // Todos los casos que trae el feed: entre vocales, Ñ.
        assertThat(TextRepair.fix("893 MU?ECAS")).isEqualTo("893 MUÑECAS");
        assertThat(TextRepair.fix("2012 CASTA?EDA")).isEqualTo("2012 CASTAÑEDA");
        assertThat(TextRepair.fix("NU?EZ")).isEqualTo("NUÑEZ");
        assertThat(TextRepair.fix("Mu?ecas")).isEqualTo("Muñecas");
        // "LL?N" e "I?N" al final: ÓN.
        assertThat(TextRepair.fix("CALLE INTERNA PABELL?N 2 C.U.")).isEqualTo("CALLE INTERNA PABELLÓN 2 C.U.");
        assertThat(TextRepair.fix("ESTACI?N")).isEqualTo("ESTACIÓN");
        // Un numero con "?": ordinal.
        assertThat(TextRepair.fix("1285 HUMBERTO 1?")).isEqualTo("1285 HUMBERTO 1º");
        // Un signo de pregunta de verdad queda.
        assertThat(TextRepair.fix("¿Viene?")).isEqualTo("¿Viene?");
    }
}
