package com.batransit.api.eventos;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Campos segun el taller oficial de la API Transporte (datosgcba/taller-api-transporte); valores de ejemplo. */
class TransitEventParserTest {

    private static final Instant NOW = Instant.parse("2026-10-26T02:00:00Z");

    private static final String FEED = """
            {"list":[
             {"code":"1","type":"Evento","subtypeNames":["Musical"],"name":"Recital en Movistar Arena",
              "description":"Buenos Aires:. Corte parcial en Humboldt","startTimestamp":"2026-10-28T21:00:00Z",
              "endTimestamp":"2026-10-29T03:00:00Z","closeTimestamp":null,"impact":"Severo",
              "fromLat":-34.5939,"fromLon":-58.4472,"networkPointFromRoadWayName":"HUMBOLDT"},
             {"code":"2","type":"Poda","description":"PODA","startTimestamp":"2026-10-26T12:00:00Z",
              "endTimestamp":"2026-10-26T18:00:00Z","impact":"Menor","fromLat":-34.6,"fromLon":-58.4},
             {"code":"3","type":"Obras en calzada","description":"OBRAS","startTimestamp":"2026-10-20T12:00:00Z",
              "endTimestamp":"2026-11-30T18:00:00Z","impact":"Severo","fromLat":-34.6,"fromLon":-58.4},
             {"code":"4","type":"Manifestación","description":"CORTE TOTAL POR MANIFESTACION",
              "startTimestamp":"2026-10-20T12:00:00Z","endTimestamp":"2026-10-21T18:00:00Z","impact":"Severo"},
             {"code":"5","type":"Obras en calzada","description":"OBRAS","startTimestamp":"2026-10-20T12:00:00Z",
              "endTimestamp":"2026-11-30T18:00:00Z","impact":"Menor"},
             {"code":"6","type":"Evento","name":"Maraton","startTimestamp":"2026-12-20T12:00:00Z","impact":"Severo"}
            ]}
            """;

    @Test
    void seQuedaConEventosMasivosYObrasSeverasVigentes() throws Exception {
        List<CityEvent> events = TransitEventParser.parse(new ObjectMapper().readTree(FEED), NOW);

        assertThat(events).extracting(CityEvent::id).containsExactly("api-1", "api-3");
        CityEvent recital = events.get(0);
        assertThat(recital.kind()).isEqualTo("EVENTO");
        assertThat(recital.title()).isEqualTo("Recital en Movistar Arena");
        assertThat(recital.description()).isEqualTo("Corte parcial en Humboldt");
        assertThat(recital.streets()).isEqualTo("HUMBOLDT");
        assertThat(recital.latitude()).isEqualTo(-34.5939);
        assertThat(recital.impact()).isEqualTo("ALTO");
        assertThat(events.get(1).kind()).isEqualTo("OBRA");
    }

    @Test
    void clasificaPorTipoYGravedad() {
        assertThat(TransitEventParser.classify("manifestacion en plaza de mayo", false)).isEqualTo("MANIFESTACION");
        assertThat(TransitEventParser.classify("obras en calzada", false)).isNull();
        assertThat(TransitEventParser.classify("obras en calzada", true)).isEqualTo("OBRA");
        assertThat(TransitEventParser.classify("poda", true)).isNull();
    }

    @Test
    void sinListaNoHayEventos() throws Exception {
        assertThat(TransitEventParser.parse(new ObjectMapper().readTree("{}"), NOW)).isEmpty();
        assertThat(TransitEventParser.parse(null, NOW)).isEmpty();
    }
}
