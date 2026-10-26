package com.batransit.api.trenes;

import com.batransit.api.domain.AlertType;
import com.batransit.api.trenes.MetroviasStatusParser.LineStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MetroviasStatusParserTest {

    /** Mensaje real del poll de info.metrovias.com.ar (26/10/2026). */
    static final String POLL = """
            {"C":"d-AA798672-I,0|P5,1|P6,2","M":[{"H":"moveShape","M":"estadoLineas","A":["<div class='col-12 fecha' id='dates'>26 de octubre de 2026</div><div><span class='col-12 linea'>Línea Urquiza</span></div><div class='col-12 titulo'>Estado del servicio:</div><div class='col-12 estado' style='color: black'>• Normal</div><div class='col-12 actualizacion'>Última Actualización 13:36 hs</div>"]}]}
            """;

    private static String html(String state) {
        return "<div><span class='col-12 linea'>Línea Urquiza</span></div><div class='col-12 titulo'>Estado del servicio:</div>"
                + "<div class='col-12 estado' style='color: red'>• " + state + "</div>";
    }

    @Test
    void leeElMensajeRealDelPoll() throws Exception {
        Optional<String> html = MetroviasStatusClient.estadoLineas(new ObjectMapper().readTree(POLL));
        assertTrue(html.isPresent());

        LineStatus status = MetroviasStatusParser.parse(html.get()).orElseThrow();
        assertEquals("URQUIZA", status.lineCode());
        assertEquals("Normal", status.status());
        assertTrue(status.normal());
    }

    @Test
    void sinMensajeEstadoLineasNoDevuelveNada() throws Exception {
        assertTrue(MetroviasStatusClient.estadoLineas(new ObjectMapper().readTree("{\"C\":\"x\",\"M\":[]}")).isEmpty());
    }

    @Test
    void unEstadoDistintoDeNormalEsUnAviso() {
        LineStatus status = MetroviasStatusParser.parse(html("Servicio interrumpido entre Lemos y Rubén Darío")).orElseThrow();
        assertFalse(status.normal());
        assertEquals(AlertType.INTERRUPCION, status.type());
        assertEquals("Servicio interrumpido entre Lemos y Rubén Darío", status.description());

        LineStatus delayed = MetroviasStatusParser.parse(html("Demorado")).orElseThrow();
        assertEquals(AlertType.DEMORA, delayed.type());
        assertEquals("Servicio demorado", delayed.description());

        assertEquals(AlertType.DESVIO, MetroviasStatusParser.parse(html("Recorrido limitado")).orElseThrow().type());
    }

    @Test
    void mensajeVacioOSinEstadoNoSeInterpreta() {
        assertTrue(MetroviasStatusParser.parse("").isEmpty());
        assertTrue(MetroviasStatusParser.parse("<div>Información no disponible</div>").isEmpty());
    }
}
