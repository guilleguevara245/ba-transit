package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusAlertParser.BusAlert;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BusAlertParserTest {

    /** Formato real de la API (26/10/2026): guiones bajos, sin route_id, solo paradas. */
    private static final String FEED = """
            {"_entity":[{"_alert":{"_active_period":[],"_cause":2,
              "_description_text":{"_translation":[{"_language":"","_text":"Queremos conocer tu opinión sobre los cambios realizados en la línea, entrá en: https://forms.gle/x"}]},
              "_effect":6,
              "_header_text":{"_translation":[{"_language":"","_text":"Recorrido en proceso de actualización Línea 148"}]},
              "_informed_entity":[{"_agency_id":null,"_route_id":null,"_route_type":0,"_stop_id":"060283770","_trip":null},
                                  {"_agency_id":null,"_route_id":null,"_route_type":0,"_stop_id":"060283771","_trip":null}]}},
             {"_alert":{"_active_period":[{"_start":1000,"_end":2000}],"_effect":4,
              "_header_text":{"_translation":[{"_language":"","_text":"Desvío Líneas 12, 37 y 60"}]},
              "_informed_entity":[]}}],
             "_header":{}}
            """;

    @Test
    void leeElFormatoRealYTomaLaLineaDelTitulo() throws Exception {
        List<BusAlert> alerts = BusAlertParser.parse(new ObjectMapper().readTree(FEED), Instant.ofEpochSecond(1500));

        assertThat(alerts).hasSize(2);
        assertThat(alerts.get(0).lines()).containsExactly("148");
        assertThat(alerts.get(0).title()).isEqualTo("Recorrido en proceso de actualización Línea 148");
        assertThat(alerts.get(0).stops()).isEqualTo(2);
        assertThat(alerts.get(1).lines()).containsExactly("12", "37", "60");
    }

    @Test
    void descartaLasQueYaNoEstanVigentes() throws Exception {
        List<BusAlert> alerts = BusAlertParser.parse(new ObjectMapper().readTree(FEED), Instant.ofEpochSecond(5000));

        assertThat(alerts).extracting(BusAlert::title).containsExactly("Recorrido en proceso de actualización Línea 148");
    }

    @Test
    void normalizaElNumeroDeLinea() {
        assertThat(BusAlertController.normalize("053")).isEqualTo("53");
        assertThat(BusAlertController.normalize("148A")).isEqualTo("148");
        assertThat(BusAlertController.normalize("Línea 60")).isEqualTo("60");
        assertThat(BusAlertController.normalize("abc")).isNull();
    }
}
