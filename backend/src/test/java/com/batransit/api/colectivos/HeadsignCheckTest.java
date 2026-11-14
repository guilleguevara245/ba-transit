package com.batransit.api.colectivos;

import static org.assertj.core.api.Assertions.assertThat;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;
import com.batransit.api.colectivos.BusModels.Catalog;
import com.batransit.api.colectivos.HeadsignCheck.Place;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class HeadsignCheckTest {

    /** Estacion Moron y un recorrido de Moron (sur) a Pacheco (unos 19 km al norte). */
    static final List<Place> PLACES = List.of(new Place("Morón", -34.6497, -58.6197),
            new Place("Constitución", -34.6277, -58.3810));

    static List<BusStop> moronToPacheco() {
        List<BusStop> stops = new ArrayList<>();
        for (int i = 0; i <= 10; i++) {
            stops.add(new BusStop("P" + i, "Parada " + i, -34.6431 + i * 0.0165, -58.6215 - i * 0.005));
        }
        return stops;
    }

    static Catalog catalog(String headsign0, String headsign1) {
        List<BusStop> there = moronToPacheco();
        List<BusStop> back = new ArrayList<>(there);
        java.util.Collections.reverse(back);
        BusRoute route = new BusRoute("1469", "303A", "", "", null, List.of(
                new BusDirection(0, headsign0, List.of(), back, List.of()),
                new BusDirection(1, headsign1, List.of(), there, List.of())));
        return new Catalog(Map.of("1469", route), Instant.EPOCH);
    }

    @Test
    void elCartelQueNombraElOrigenSeIntercambia() {
        int[] swapped = {0};
        Catalog fixed = HeadsignCheck.fix(catalog("a Colectora Pta. 2 Ford", "a Est. Morón"), PLACES, swapped);
        List<BusDirection> directions = fixed.routes().get("1469").directions();
        // El que sale de Moron va a Ford; el que vuelve, a Moron.
        assertThat(directions.get(1).headsign()).isEqualTo("a Colectora Pta. 2 Ford");
        assertThat(directions.get(0).headsign()).isEqualTo("a Est. Morón");
        assertThat(swapped[0]).isEqualTo(1);
    }

    @Test
    void siLosCartelesEstanBienNoSeTocan() {
        Catalog fixed = HeadsignCheck.fix(catalog("a Est. Morón", "a Colectora Pta. 2 Ford"), PLACES, null);
        assertThat(fixed.routes().get("1469").directions().get(0).headsign()).isEqualTo("a Est. Morón");
    }

    @Test
    void siLosDosDicenLoMismoNoSeTocan() {
        // Uno termina en Moron (bien) y el otro sale de Moron con el mismo cartel: no se sabe cual es el otro.
        Catalog fixed = HeadsignCheck.fix(catalog("a Est. Morón", "a Est. Morón x Hurlingham"), PLACES, null);
        assertThat(fixed.routes().get("1469").directions().get(1).headsign()).isEqualTo("a Est. Morón x Hurlingham");
    }

    @Test
    void elDestinoEsLoQueVaDespuesDeLaAYAntesDelPor() {
        Map<String, List<Place>> byName = Map.of("constitucion", List.of(PLACES.get(1)), "moron", List.of(PLACES.get(0)));
        assertThat(HeadsignCheck.destination("a Constitución x Morón", byName)).containsExactly(PLACES.get(1));
        assertThat(HeadsignCheck.destination("x Morón hasta Constitución", byName)).containsExactly(PLACES.get(1));
        assertThat(HeadsignCheck.destination("Ramal A - Morón", byName)).isEmpty();
    }
}
