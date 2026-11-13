package com.batransit.api.live;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusStop;
import com.batransit.api.live.BusPositionsController.Vehicle;
import com.batransit.api.live.StopArrivals.Approaching;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Colectivos que vienen hacia una parada, sobre un recorrido recto de prueba. */
class StopArrivalsTest {

    /** Diez paradas en linea recta hacia el este, unos 180 m entre cada una y 2 minutos entre paradas. */
    static BusDirection straight() {
        List<BusStop> stops = new ArrayList<>();
        List<Integer> minutes = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            stops.add(new BusStop("P" + i, "Parada " + i, -34.6, -58.45 + i * 0.002));
            minutes.add(i * 2);
        }
        return new BusDirection(0, "A Plaza de Mayo", List.of(), stops, minutes);
    }

    static Vehicle at(String id, double stopsFromStart) {
        return new Vehicle(id, -34.6, -58.45 + stopsFromStart * 0.002, 0, "A Plaza de Mayo", 0, false);
    }

    @Test
    void losQueVienenOrdenadosDelMasCercano() {
        List<Approaching> buses = StopArrivals.approaching(straight(), 7,
                List.of(at("lejos", 1.5), at("cerca", 5.5), at("paso", 8.2)));

        assertThat(buses).extracting(Approaching::id).containsExactly("cerca", "lejos");
        // Entre la 5 y la 6: le faltan 2 paradas (6 y 7) y 3 minutos (de 11 a 14).
        assertThat(buses.get(0).stopsAway()).isEqualTo(2);
        assertThat(buses.get(0).minutes()).isEqualTo(3);
        assertThat(buses.get(1).stopsAway()).isEqualTo(6);
        assertThat(buses.get(1).minutes()).isEqualTo(11);
    }

    @Test
    void alLadoDeLaParadaEstaLlegando() {
        List<Approaching> buses = StopArrivals.approaching(straight(), 4, List.of(at("llegando", 3.7)));

        assertThat(buses).hasSize(1);
        Approaching bus = buses.get(0);
        assertThat(bus.arriving()).isTrue();
        assertThat(bus.minutes()).isEqualTo(0);
        assertThat(bus.stopsAway()).isEqualTo(0);
    }

    @Test
    void loQueEstaLejosDelRecorridoNoCuenta() {
        Vehicle desviado = new Vehicle("desvio", -34.62, -58.44, 0, "", 0, false); // a mas de 2 km
        assertThat(StopArrivals.approaching(straight(), 7, List.of(desviado))).isEmpty();
    }

    @Test
    void losQueEsperanCercaPeroFueraDelRecorridoNoCuentan() {
        BusDirection base = straight();
        List<double[]> shape = List.of(new double[] {-34.6, -58.45}, new double[] {-34.6, -58.45 + 9 * 0.002});
        BusDirection direction = new BusDirection(0, base.headsign(), shape, base.stops(), base.minutes());
        // Tres cuadras al norte de la parada 6 (unos 330 m): un garage o la terminal, no el recorrido.
        Vehicle garage = new Vehicle("garage", -34.597, -58.45 + 6 * 0.002, 0, "", 0, false);
        Vehicle enCamino = at("en camino", 4.5);

        assertThat(StopArrivals.approaching(direction, 7, List.of(garage, enCamino)))
                .extracting(Approaching::id).containsExactly("en camino");
        // Sin el recorrido dibujado, a esa distancia todavia se lo ubicaba en el tramo.
        assertThat(StopArrivals.approaching(base, 7, List.of(garage))).hasSize(1);
    }

    @Test
    void laPosicionViejaDescuentaElTiempo() {
        Vehicle viejo = new Vehicle("viejo", -34.6, -58.45 + 2 * 0.002, 0, "", 180, false);
        // Desde la 2 a la 7 son 10 minutos; la posicion es de hace 3.
        assertThat(StopArrivals.approaching(straight(), 7, List.of(viejo)).get(0).minutes()).isEqualTo(7);
    }

    @Test
    void sinMinutosDelFeedSoloDiceLasParadas() {
        BusDirection base = straight();
        List<Integer> sinMinutos = new ArrayList<>(base.minutes());
        sinMinutos.set(7, null);
        BusDirection direction = new BusDirection(0, base.headsign(), List.of(), base.stops(), sinMinutos);

        Approaching bus = StopArrivals.approaching(direction, 7, List.of(at("x", 3))).get(0);
        assertThat(bus.minutes()).isNull();
        assertThat(bus.stopsAway()).isEqualTo(4);
    }
}
