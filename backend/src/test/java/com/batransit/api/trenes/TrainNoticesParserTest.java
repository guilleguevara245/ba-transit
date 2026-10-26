package com.batransit.api.trenes;

import com.batransit.api.domain.AlertType;
import com.batransit.api.trenes.TrainNoticesParser.Result;
import com.batransit.api.trenes.TrainNoticesParser.TrainNotice;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class TrainNoticesParserTest {

    private static String fixture() throws IOException {
        try (InputStream in = TrainNoticesParserTest.class.getResourceAsStream("/trenes/modificaciones-servicio.html")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void leeLosAvisosDeCadaLineaDelAmba() throws IOException {
        Result result = TrainNoticesParser.parse(fixture());

        // Roca, Mitre, Sarmiento y San Martin; Larga distancia se ignora.
        assertThat(result.sectionsFound()).isEqualTo(4);
        assertThat(result.notices()).extracting(TrainNotice::lineCode)
                .containsExactly("ROCA", "ROCA", "ROCA", "ROCA", "SARMIENTO", "SARMIENTO");

        TrainNotice closed = result.notices().get(3);
        assertThat(closed.type()).isEqualTo(AlertType.INTERRUPCION);
        assertThat(closed.text()).isEqualTo("La estación Hipólito Yrigoyen se encuentra cerrada.");
        assertThat(closed.description()).startsWith("Ramales Plaza Constitución – Ezeiza");

        assertThat(result.notices().get(4).type()).isEqualTo(AlertType.DESVIO);
        assertThat(result.notices().get(0).type()).isEqualTo(AlertType.OBRA);
    }

    @Test
    void unaPaginaSinLineasNoDevuelveNada() {
        assertThat(TrainNoticesParser.parse("<html><body>Mantenimiento</body></html>").sectionsFound()).isZero();
        assertThat(TrainNoticesParser.parse(null).notices()).isEmpty();
    }

    @Test
    void elIdNoCambiaSiElAvisoEsElMismo() {
        TrainNotice a = new TrainNotice("ROCA", "Ramal X", "Texto", AlertType.OBRA);
        TrainNotice b = new TrainNotice("ROCA", "Ramal X", "Texto", AlertType.OBRA);
        TrainNotice c = new TrainNotice("ROCA", "Ramal X", "Otro texto", AlertType.OBRA);
        assertThat(TrainNoticesSyncService.externalId(a)).isEqualTo(TrainNoticesSyncService.externalId(b))
                .startsWith("trenes-ar:ROCA:").isNotEqualTo(TrainNoticesSyncService.externalId(c));
    }
}
