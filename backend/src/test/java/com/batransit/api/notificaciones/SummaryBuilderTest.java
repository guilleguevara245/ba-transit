package com.batransit.api.notificaciones;

import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.batransit.api.domain.AlertType;
import com.batransit.api.notificaciones.NotificationPlanner.StationInfo;
import com.batransit.api.notificaciones.NotificationPlanner.Subscriber;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;
import com.batransit.api.notificaciones.SummaryBuilder.ActiveAlert;
import com.batransit.api.notificaciones.SummaryBuilder.StationRef;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class SummaryBuilderTest {

    static final String SITE = NotificationPlannerTest.SITE;
    static final Map<Long, LineInfo> LINES = Map.of(2L, NotificationPlannerTest.B, 9L, NotificationPlannerTest.SARMIENTO);
    static final Map<Long, StationRef> STATIONS = Map.of(109L, new StationRef(2, new StationInfo(109, "Medrano", 2, 9)));

    static Subscriber sub(Set<Long> lines, Set<Long> stations, Set<String> accesses) {
        return new Subscriber(1, lines, stations, accesses, true, true, true, true);
    }

    @Test
    void conProblemas() {
        List<ActiveAlert> alerts = List.of(new ActiveAlert(2, AlertType.OBRA, "Obras programadas."),
                new ActiveAlert(2, AlertType.DEMORA, "Demoras por un problema técnico."));
        PushMessage m = SummaryBuilder.build(sub(Set.of(2L, 9L), Set.of(), Set.of()), "Guille", 7, LINES, alerts, STATIONS,
                NotificationPlannerTest.report(Instant.now(), TrafficStatus.FLUIDO, 80), SITE).orElseThrow();
        assertThat(m.title()).isEqualTo("Buen día, Guille: 1 problema en tus favoritos");
        // La mas grave de la linea (demora antes que obra).
        assertThat(m.body()).isEqualTo("Línea B con demoras. El resto, normal.");
        assertThat(m.url()).isEqualTo(SITE + "/");
    }

    @Test
    void estacionYAcceso() {
        List<ActiveAlert> alerts = List.of(new ActiveAlert(2, AlertType.OBRA, "Estación Medrano cerrada por obras."));
        PushMessage m = SummaryBuilder.build(sub(Set.of(), Set.of(109L), Set.of("oeste")), null, 8, LINES, alerts, STATIONS,
                NotificationPlannerTest.report(Instant.now(), TrafficStatus.CONGESTIONADO, 25), SITE).orElseThrow();
        assertThat(m.title()).isEqualTo("Buen día: 2 problemas en tus favoritos");
        assertThat(m.body()).isEqualTo("Medrano cerrada · Acceso Oeste congestionado hacia CABA.");
    }

    @Test
    void todoNormal() {
        PushMessage m = SummaryBuilder.build(sub(Set.of(2L, 9L), Set.of(109L), Set.of("oeste")), "Ana", 13, LINES, List.of(),
                STATIONS, NotificationPlannerTest.report(Instant.now(), TrafficStatus.FLUIDO, 80), SITE).orElseThrow();
        assertThat(m.title()).isEqualTo("Buenas tardes, Ana: todo normal");
        assertThat(m.body()).isEqualTo("Tus 2 líneas, 1 estación y 1 acceso funcionan sin problemas.");
        assertThat(SummaryBuilder.favoritesPhrase(1, 0, 0)).isEqualTo("Tu línea funciona");
    }

    @Test
    void sinFavoritosNoHayResumen() {
        assertThat(SummaryBuilder.build(sub(Set.of(), Set.of(), Set.of()), "Ana", 7, LINES, List.of(), STATIONS, null, SITE))
                .isEqualTo(Optional.empty());
    }

    @Test
    void horaYDiasDelResumen() {
        ZoneId ba = NotificationService.BUENOS_AIRES;
        ZonedDateTime thursday0731 = ZonedDateTime.of(2026, 10, 29, 7, 31, 0, 0, ba);
        assertThat(NotificationJobs.isDue("07:30", "12345", thursday0731)).isEqualTo(true);
        assertThat(NotificationJobs.isDue("07:30", "67", thursday0731)).isEqualTo(false);
        assertThat(NotificationJobs.isDue("07:30", "12345", thursday0731.withMinute(41))).isEqualTo(false);
        assertThat(NotificationJobs.isDue("07:30", "12345", thursday0731.withMinute(29))).isEqualTo(false);
        assertThat(NotificationService.summaryDays(List.of(5, 1, 1, 9))).isEqualTo("15");
    }
}
