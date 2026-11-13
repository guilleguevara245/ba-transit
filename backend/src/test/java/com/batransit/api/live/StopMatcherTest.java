package com.batransit.api.live;

import com.batransit.api.colectivos.BusModels.BusDirection;
import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.BusStop;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** La parada de otra linea en la misma esquina, aunque tenga otro codigo. */
class StopMatcherTest {

    /** Cinco paradas en linea recta, unos 180 m entre cada una; offset corre todo hacia el norte. */
    static BusDirection straight(String prefix, double offset, boolean reversed) {
        List<BusStop> stops = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            stops.add(new BusStop(prefix + i, "Parada " + i, -34.6 + offset, -58.45 + i * 0.002));
        }
        if (reversed) {
            java.util.Collections.reverse(stops);
        }
        return new BusDirection(0, "", List.of(), stops, List.of());
    }

    static BusRoute route(String id, BusDirection... directions) {
        return new BusRoute(id, id, "", "", null, List.of(directions));
    }

    @Test
    void laMismaParadaPorSuCodigo() {
        BusDirection own = straight("P", 0, false);
        BusDirection other = straight("P", 0, false);
        StopMatcher.Match m = StopMatcher.find(route("163", other), own, 2).orElseThrow();
        assertThat(m.stopIndex()).isEqualTo(2);
    }

    @Test
    void laDeAlLadoConOtroCodigoYParaElMismoLado() {
        // La otra linea tiene sus propios codigos, unos 30 m al norte (la misma vereda, otra marca).
        BusDirection own = straight("P", 0, false);
        BusDirection other = straight("Q", 0.00027, false);
        StopMatcher.Match m = StopMatcher.find(route("303", other), own, 2).orElseThrow();
        assertThat(m.direction().stops().get(m.stopIndex()).id()).isEqualTo("Q2");
    }

    @Test
    void noLaDeEnfrenteNiLaDeOtraCuadra() {
        BusDirection own = straight("P", 0, false);
        // Enfrente: cerca pero para el otro lado.
        assertThat(StopMatcher.find(route("303", straight("Q", 0.00027, true)), own, 2)).isEmpty();
        // A unos 200 m: es otra parada.
        assertThat(StopMatcher.find(route("303", straight("Q", 0.0018, false)), own, 2)).isEmpty();
    }
}
