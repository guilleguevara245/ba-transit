package com.batransit.api.live;

import com.batransit.api.live.SubteSchedule.Direction;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Contra la copia real del GTFS del subte que viene con la aplicacion. */
class SubteScheduleTest {

    private static SubteSchedule schedule;

    @BeforeAll
    static void load() throws Exception {
        try (InputStream in = SubteScheduleTest.class.getResourceAsStream("/gtfs/subte.zip")) {
            schedule = SubteSchedule.parse(in.readAllBytes());
        }
    }

    private static Direction towards(List<Direction> directions, String towards) {
        return directions.stream().filter(d -> d.towards().equals(towards)).findFirst().orElseThrow();
    }

    @Test
    void estacionIntermediaTieneLosDosSentidos() {
        List<Direction> d = schedule.nextArrivals("D", "Facultad de Medicina", LocalDateTime.of(2026, 10, 26, 13, 52));
        assertEquals(2, d.size());
        Direction catedral = towards(d, "Catedral");
        assertEquals(5, catedral.headwayMinutes());
        assertEquals(3, catedral.arrivals().size());
        assertTrue(catedral.arrivals().get(0).minutes() <= 5);
        assertTrue(catedral.arrivals().stream().allMatch(SubteSchedule.Arrival::estimated));
    }

    @Test
    void enLaCabeceraSoloSaleHaciaElOtroExtremo() {
        List<Direction> d = schedule.nextArrivals("A", "Plaza de Mayo", LocalDateTime.of(2026, 10, 26, 13, 52));
        assertEquals(1, d.size());
        assertEquals("San Pedrito", d.get(0).towards());
    }

    @Test
    void reconoceLosNombresQueEnElGtfsEstanEscritosDistinto() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 26, 13, 52);
        assertEquals(2, schedule.nextArrivals("H", "Humberto I", now).size());
        assertEquals(2, schedule.nextArrivals("H", "Once - 30 de Diciembre", now).size());
        assertEquals(2, schedule.nextArrivals("E", "Avenida La Plata", now).size());
        assertEquals(1, schedule.nextArrivals("P", "Centro Cívico Lugano", now).size());
        assertTrue(schedule.nextArrivals("P", "Nuestra Señora de Fátima", now).size() >= 2);
    }

    @Test
    void antesDelPrimerTrenNoHayFrecuenciaVigente() {
        List<Direction> d = schedule.nextArrivals("B", "Medrano", LocalDateTime.of(2026, 10, 26, 3, 0));
        assertEquals(2, d.size());
        assertNull(d.get(0).headwayMinutes());
        assertTrue(d.get(0).arrivals().get(0).minutes() > 120);
    }

    @Test
    void unFeriadoUsaElHorarioDeDomingo() {
        // 8 de diciembre de 2026 es martes: el GTFS lo pasa al servicio de domingo (primer tren 8:00).
        List<Direction> d = schedule.nextArrivals("B", "Medrano", LocalDateTime.of(2026, 12, 8, 7, 0));
        assertNull(d.get(0).headwayMinutes());
        assertTrue(d.get(0).arrivals().get(0).minutes() >= 60);
    }

    @Test
    void despuesDelFinDelGtfsSigueUsandoElDiaDeLaSemana() {
        List<Direction> d = schedule.nextArrivals("B", "Medrano", LocalDateTime.of(2027, 1, 4, 8, 0));
        assertEquals(2, d.size());
        assertEquals(4, d.get(0).headwayMinutes());
    }

    @Test
    void lineaInexistenteNoDevuelveNada() {
        assertTrue(schedule.nextArrivals("Z", "Medrano", LocalDateTime.of(2026, 10, 26, 13, 0)).isEmpty());
    }
}
