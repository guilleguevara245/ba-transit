package com.batransit.api.trenes;

import com.batransit.api.trenes.FerroviasArrivals.Arrival;
import com.batransit.api.trenes.FerroviasArrivals.Direction;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FerroviasArrivalsTest {

    private static String fixture(String name) throws IOException {
        try (InputStream in = FerroviasArrivalsTest.class.getResourceAsStream("/trenes/" + name)) {
            return new String(in.readAllBytes(), StandardCharsets.ISO_8859_1);
        }
    }

    @Test
    void leeLaRespuestaRealDeRetiro() throws IOException {
        List<Direction> directions = FerroviasArrivals.parse(fixture("ferrovias-retiro.html"));

        assertEquals(1, directions.size());
        Direction toVillaRosa = directions.get(0);
        assertEquals("Villa Rosa", toVillaRosa.towards());
        assertEquals(0, toVillaRosa.directionId());
        assertEquals(List.of(
                new Arrival(8, false, "Grand Bourg"),
                new Arrival(24, false, "Villa Rosa"),
                new Arrival(40, false, "Villa Rosa")), toVillaRosa.arrivals());
    }

    @Test
    void separaLosDosSentidosEnUnaEstacionIntermedia() {
        String html = section("RETIRO", row("RETIRO", "3 min"), row("RETIRO", "1 h 5 min"))
                + section("VILLA ROSA", row("ING. PABLO NOGUES", "Llegando"));

        List<Direction> directions = FerroviasArrivals.parse(html);

        assertEquals(2, directions.size());
        assertEquals("Retiro", directions.get(0).towards());
        assertEquals(1, directions.get(0).directionId());
        assertEquals(List.of(new Arrival(3, false, "Retiro"), new Arrival(65, false, "Retiro")),
                directions.get(0).arrivals());
        assertEquals(List.of(new Arrival(0, false, "Pablo Nogués")), directions.get(1).arrivals());
    }

    @Test
    void unSentidoSinTrenesQuedaVacio() {
        List<Direction> directions = FerroviasArrivals.parse(section("RETIRO"));
        assertEquals(1, directions.size());
        assertTrue(directions.get(0).arrivals().isEmpty());
    }

    @Test
    void reconoceLasEstacionesPorElNombreDeLaBase() {
        assertEquals(75, FerroviasArrivals.stationId("Retiro"));
        assertEquals(86, FerroviasArrivals.stationId("florida"));
        assertEquals(111, FerroviasArrivals.stationId("Pablo Nogués"));
        assertEquals(135, FerroviasArrivals.stationId("Cecilia Grierson"));
        assertNull(FerroviasArrivals.stationId("Constitución"));
    }

    @Test
    void entiendeLosTiempos() {
        assertEquals(8, FerroviasArrivals.minutes("8 min"));
        assertEquals(0, FerroviasArrivals.minutes("En andén"));
        assertEquals(70, FerroviasArrivals.minutes("1 hora 10 min"));
        assertNull(FerroviasArrivals.minutes("--"));
    }

    private static String section(String towards, String... rows) {
        return "<td class=\"table_title tdflecha2\" style=\"border:none\">\n " + towards + "\n</td>"
                + "<table id=\"table_main\">" + String.join("", rows) + "</table>";
    }

    private static String row(String destination, String time) {
        return "<tr><td class=\"tdEst\">\n" + destination + "\n</td>\n<td class=\"tdEst tdEstr tdflecha\">\n"
                + time + "\n</td></tr>";
    }
}
