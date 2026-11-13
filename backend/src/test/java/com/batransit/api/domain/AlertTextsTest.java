package com.batransit.api.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AlertTextsTest {

    @Test
    void avisosQueNoSonProblemas() {
        assertThat(AlertTexts.isInformative("14-11 horario extendido por la Noche de los Museos")).isTrue();
        assertThat(AlertTexts.isInformative("Mañana extendido por la Noche de los Museos")).isTrue();
        assertThat(AlertTexts.isInformative("Por el recital, la línea extiende su horario hasta la 1")).isTrue();
        assertThat(AlertTexts.isInformative("Servicio adicional por el partido")).isTrue();
        assertThat(AlertTexts.isInformative("Habrá trenes adicionales a la salida del estadio")).isTrue();
        assertThat(AlertTexts.isInformative("HORARIO ESPECIAL POR FERIADO")).isTrue();
    }

    @Test
    void problemasONada() {
        assertThat(AlertTexts.isInformative("Servicio limitado entre Perú y San Pedrito")).isFalse();
        assertThat(AlertTexts.isInformative("Horario extendido. Estación Callao cerrada por obras")).isFalse();
        assertThat(AlertTexts.isInformative("Mañana extendido por la Noche de los Museos. Medrano cerrado por obras")).isFalse();
        assertThat(AlertTexts.isInformative("Demoras por un problema técnico")).isFalse();
        assertThat(AlertTexts.isInformative("")).isFalse();
        assertThat(AlertTexts.isInformative(null)).isFalse();
    }
}
