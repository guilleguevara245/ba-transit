package com.batransit.api.notificaciones;

import com.batransit.api.accesos.AccessModels.AccessReport;
import com.batransit.api.accesos.AccessModels.AccessesResponse;
import com.batransit.api.accesos.AccessModels.DirectionReport;
import com.batransit.api.accesos.AccessModels.SegmentReport;
import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.notificaciones.NotificationPlanner.AccessChange;
import com.batransit.api.notificaciones.NotificationPlanner.AlertEvent;
import com.batransit.api.notificaciones.NotificationPlanner.Planned;
import com.batransit.api.notificaciones.NotificationPlanner.StationInfo;
import com.batransit.api.notificaciones.NotificationPlanner.Subscriber;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationPlannerTest {

    static final String SITE = "https://ba-transit.onrender.com";
    static final LineInfo B = new LineInfo(2, TransportMode.SUBTE, "B", "Línea B");
    static final LineInfo SARMIENTO = new LineInfo(9, TransportMode.TREN, "SARMIENTO", "Línea Sarmiento");
    static final LineInfo PREMETRO = new LineInfo(15, TransportMode.PREMETRO, "P", "Premetro");
    static final List<StationInfo> B_STATIONS = List.of(
            new StationInfo(108, "Carlos Gardel", 2, 8), new StationInfo(109, "Medrano", 2, 9),
            new StationInfo(110, "Ángel Gallardo", 2, 10));

    static Subscriber sub(long id, Set<Long> lines, Set<Long> stations, Set<String> accesses) {
        return new Subscriber(id, lines, stations, accesses, true, true, true, true);
    }

    @Test
    void textosDeLinea() {
        assertThat(NotificationTexts.lineTitle(B, AlertType.DEMORA)).isEqualTo("Línea B con demoras");
        assertThat(NotificationTexts.lineTitle(B, AlertType.INTERRUPCION)).isEqualTo("Línea B interrumpida");
        assertThat(NotificationTexts.lineTitle(SARMIENTO, AlertType.INTERRUPCION)).isEqualTo("Tren Sarmiento interrumpido");
        assertThat(NotificationTexts.lineTitle(SARMIENTO, AlertType.OBRA)).isEqualTo("Obras en el Tren Sarmiento");
        assertThat(NotificationTexts.lineTitle(PREMETRO, AlertType.DESVIO)).isEqualTo("Cambios en el servicio del Premetro");
        assertThat(new LineInfo(12, TransportMode.TREN, "TREN_DE_LA_COSTA", "Tren de la Costa").display()).isEqualTo("Tren de la Costa");
        assertThat(SARMIENTO.slug()).isEqualTo("sarmiento");
        assertThat(PREMETRO.slug()).isEqualTo("premetro");
    }

    @Test
    void lineaAQuienLaSigue() {
        AlertEvent e = new AlertEvent(50, B, AlertType.DEMORA, "Servicio con demoras por un problema técnico.", false);
        List<Planned> plan = NotificationPlanner.forAlert(e, B_STATIONS,
                List.of(sub(1, Set.of(2L), Set.of(), Set.of()), sub(2, Set.of(9L), Set.of(), Set.of())), SITE, (s, k) -> false);
        assertThat(plan.size()).isEqualTo(1);
        Planned p = plan.get(0);
        assertThat(p.subscriptionId()).isEqualTo(1L);
        assertThat(p.eventKey()).isEqualTo("alerta:50");
        assertThat(p.message().title()).isEqualTo("Línea B con demoras");
        assertThat(p.message().icon()).isEqualTo(SITE + "/notif/linea-subte-b.png");
        assertThat(p.message().url()).isEqualTo(SITE + "/lineas/subte-b");
        assertThat(p.message().action()).isEqualTo("Ver la línea");
    }

    @Test
    void estacionGanaALaLineaYSugiereLasVecinas() {
        AlertEvent e = new AlertEvent(51, B, AlertType.OBRA, "Estación Medrano cerrada por obras.", false);
        List<Planned> plan = NotificationPlanner.forAlert(e, B_STATIONS,
                List.of(sub(1, Set.of(2L), Set.of(109L), Set.of())), SITE, (s, k) -> false);
        assertThat(plan.size()).isEqualTo(1);
        PushMessage m = plan.get(0).message();
        assertThat(m.title()).isEqualTo("Tu estación Medrano está cerrada");
        assertThat(m.body()).isEqualTo("Línea B · Estación Medrano cerrada por obras. Las más cercanas: Carlos Gardel y Ángel Gallardo.");
        assertThat(m.icon()).isEqualTo(SITE + "/notif/estacion-subte-b.png");
        assertThat(m.url()).isEqualTo(SITE + "/estaciones/subte-b/medrano");
        assertThat(m.action()).isEqualTo("Ver la estación");

        // Quien no sigue la linea ni la estacion no recibe nada; quien solo sigue la linea, el de linea.
        List<Planned> others = NotificationPlanner.forAlert(e, B_STATIONS,
                List.of(sub(2, Set.of(), Set.of(), Set.of()), sub(3, Set.of(2L), Set.of(108L), Set.of())), SITE, (s, k) -> false);
        assertThat(others.size()).isEqualTo(1);
        assertThat(others.get(0).message().title()).isEqualTo("Obras en la Línea B");
    }

    @Test
    void finSoloAQuienRecibioElInicioYLoQuiere() {
        AlertEvent end = new AlertEvent(51, B, AlertType.OBRA, "Estación Medrano cerrada por obras.", true);
        Subscriber wants = sub(1, Set.of(), Set.of(109L), Set.of());
        Subscriber noResolved = new Subscriber(2, Set.of(), Set.of(109L), Set.of(), true, true, true, false);
        Subscriber neverGotStart = sub(3, Set.of(), Set.of(109L), Set.of());
        Set<String> sent = new HashSet<>(Set.of("1:alerta:51", "2:alerta:51"));
        List<Planned> plan = NotificationPlanner.forAlert(end, B_STATIONS, List.of(wants, noResolved, neverGotStart), SITE,
                (s, k) -> sent.contains(s + ":" + k));
        assertThat(plan.size()).isEqualTo(1);
        assertThat(plan.get(0).eventKey()).isEqualTo("alerta-fin:51");
        assertThat(plan.get(0).message().title()).isEqualTo("Medrano volvió a abrir");
        assertThat(plan.get(0).message().resolved()).isEqualTo(true);
    }

    @Test
    void tiposApagados() {
        AlertEvent e = new AlertEvent(52, B, AlertType.DEMORA, "Demoras en la línea.", false);
        Subscriber noLines = new Subscriber(1, Set.of(2L), Set.of(), Set.of(), false, true, true, true);
        assertThat(NotificationPlanner.forAlert(e, B_STATIONS, List.of(noLines), SITE, (s, k) -> false).size()).isEqualTo(0);
    }

    static AccessesResponse report(Instant at, TrafficStatus status, int speed) {
        DirectionReport toCaba = new DirectionReport("CABA", status, speed, 90, List.of());
        DirectionReport toProv = new DirectionReport("Provincia", TrafficStatus.FLUIDO, 85, 90, List.of());
        SegmentReport seg = new SegmentReport("General Paz – Morón", status, speed, 90, false, List.of(), List.of(toCaba, toProv));
        return new AccessesResponse(true, at, List.of(new AccessReport("oeste", "Acceso Oeste", "RN 7", "", "", List.of(seg))));
    }

    @Test
    void accesoAvisaConDosMedicionesSeguidasYAlNormalizarse() {
        AccessWatcher watcher = new AccessWatcher();
        Instant t = Instant.parse("2026-10-29T21:00:00Z");
        assertThat(watcher.update(report(t, TrafficStatus.CONGESTIONADO, 25)).size()).isEqualTo(0); // una sola medicion
        assertThat(watcher.update(report(t, TrafficStatus.CONGESTIONADO, 25)).size()).isEqualTo(0); // la misma medicion
        List<AccessChange> bad = watcher.update(report(t.plusSeconds(1200), TrafficStatus.CONGESTIONADO, 24));
        assertThat(bad.size()).isEqualTo(1);
        assertThat(bad.get(0).towards()).isEqualTo("CABA");
        assertThat(watcher.update(report(t.plusSeconds(2400), TrafficStatus.CONGESTIONADO, 20)).size()).isEqualTo(0); // sigue igual
        assertThat(watcher.update(report(t.plusSeconds(3600), TrafficStatus.SIN_DATOS, 0)).size()).isEqualTo(0);
        List<AccessChange> ok = watcher.update(report(t.plusSeconds(4800), TrafficStatus.FLUIDO, 82));
        assertThat(ok.size()).isEqualTo(1);
        assertThat(ok.get(0).resolved()).isEqualTo(true);
        assertThat(ok.get(0).episodeKey()).isEqualTo(bad.get(0).episodeKey());

        Subscriber s = sub(1, Set.of(), Set.of(), Set.of("oeste"));
        List<Planned> start = NotificationPlanner.forAccess(bad.get(0), List.of(s, sub(2, Set.of(), Set.of(), Set.of("norte"))),
                SITE, "2026102918", (id, k) -> false);
        assertThat(start.size()).isEqualTo(1);
        assertThat(start.get(0).message().title()).isEqualTo("Acceso Oeste congestionado hacia CABA");
        assertThat(start.get(0).message().body()).isEqualTo("Entre General Paz y Morón se va a 24 km/h (lo normal es 90). Si podés, salí más tarde.");
        assertThat(start.get(0).message().icon()).isEqualTo(SITE + "/notif/acceso-oeste.png");
        // Ya hubo un aviso de este acceso en esta hora: no se repite.
        assertThat(NotificationPlanner.forAccess(bad.get(0), List.of(s), SITE, "2026102918",
                (id, k) -> k.equals("acceso-hora:oeste:2026102918")).size()).isEqualTo(0);

        List<Planned> end = NotificationPlanner.forAccess(ok.get(0), List.of(s), SITE, "2026102920",
                (id, k) -> k.equals(bad.get(0).episodeKey()));
        assertThat(end.get(0).message().title()).isEqualTo("Acceso Oeste ya circula fluido");
        assertThat(end.get(0).message().body()).isEqualTo("Hacia CABA, entre General Paz y Morón, a 82 km/h.");
    }

    @Test
    void textosDeAcceso() {
        assertThat(NotificationTexts.accessTitle("Acceso Norte (Panamericana)", "General Paz – Márquez", "Provincia",
                TrafficStatus.CORTADO)).isEqualTo("Acceso Norte cortado hacia Provincia");
        assertThat(NotificationTexts.accessTitle("Riccheri / Ezeiza–Cañuelas", "Autopista Riccheri", "CABA",
                TrafficStatus.CONGESTIONADO)).isEqualTo("Autopista Riccheri congestionada hacia CABA");
        assertThat(NotificationTexts.accessBody("General Paz – Márquez", TrafficStatus.CORTADO, null, null))
                .isEqualTo("Tramo General Paz – Márquez cortado. Buscá un camino alternativo.");
    }

    @Test
    void estacionesNombradas() {
        assertThat(StationMatcher.mentions("La estación Hipólito Yrigoyen se encuentra cerrada", "Hipólito Yrigoyen")).isEqualTo(true);
        assertThat(StationMatcher.mentions("Ramales Plaza Constitución - Ezeiza: la estación Hipólito Yrigoyen cerrada",
                "Plaza Constitución")).isEqualTo(false);
        assertThat(StationMatcher.mentions("Estaciones Entre Ríos y Urquiza cerradas", "Entre Ríos - Rodolfo Walsh")).isEqualTo(true);
        assertThat(StationMatcher.saysClosed("Los trenes pasan sin detenerse en Medrano")).isEqualTo(true);
        assertThat(StationMatcher.saysClosed("Ascensor fuera de servicio")).isEqualTo(false);
    }
}
