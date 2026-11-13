package com.batransit.api.domain;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AlertTest {

    private static final Instant LONG_AGO = Instant.parse("2026-10-04T12:00:00Z");

    /** Una alerta de la fuente publicada hace tiempo (la fecha no tiene setter: la pone el constructor). */
    private static Alert publishedLongAgo(String text) throws ReflectiveOperationException {
        Alert alert = new Alert(null, AlertType.DEMORA, text, "API Transporte GCBA", "Alerta_D", null, null);
        Field publishedAt = Alert.class.getDeclaredField("publishedAt");
        publishedAt.setAccessible(true);
        publishedAt.set(alert, LONG_AGO);
        return alert;
    }

    @Test
    void sameTextKeepsThePublishDate() throws ReflectiveOperationException {
        Alert alert = publishedLongAgo("Obras en la estacion Callao");

        alert.updateFromSource(AlertType.OBRA, "Obras en la estacion Callao", null, null);

        assertThat(alert.getPublishedAt()).isEqualTo(LONG_AGO);
        assertThat(alert.getType()).isEqualTo(AlertType.OBRA);
    }

    @Test
    void newTextWithAnOldIdIsPublishedAgain() throws ReflectiveOperationException {
        Alert alert = publishedLongAgo("Obras en la estacion Callao");

        alert.updateFromSource(AlertType.DEMORA, "14-11 horario extendido por la Noche de los Museos", null, null);

        assertThat(alert.getPublishedAt()).isAfter(LONG_AGO);
    }

    @Test
    void alertThatComesBackIsPublishedAgain() throws ReflectiveOperationException {
        Alert alert = publishedLongAgo("Servicio limitado");
        alert.setActive(false);

        alert.updateFromSource(AlertType.DEMORA, "Servicio limitado", null, null);

        assertThat(alert.isActive()).isTrue();
        assertThat(alert.getPublishedAt()).isAfter(LONG_AGO);
    }
}
