package com.batransit.api.notificaciones;

import com.batransit.api.clima.WeatherAlertService.WeatherAlert;
import com.batransit.api.domain.SpecialServiceKind;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.notificaciones.ExtraNotices.FareChange;
import com.batransit.api.notificaciones.ExtraNotices.FareRow;
import com.batransit.api.notificaciones.ExtraNotices.SpecialItem;
import com.batransit.api.notificaciones.ExtraNotices.Target;
import com.batransit.api.notificaciones.NotificationPlanner.Planned;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Clima, tarifas, servicios especiales y ultimo tren. */
class ExtraNoticesTest {

    private static final String SITE = "https://ba-transit.onrender.com";
    // Jueves 29 de octubre de 2026, 15:00 en Buenos Aires.
    private static final ZonedDateTime NOW = ZonedDateTime.of(2026, 10, 29, 15, 0, 0, 0, NotificationService.BUENOS_AIRES);
    private static final LineInfo LINE_B = new LineInfo(2, TransportMode.SUBTE, "B", "Línea B");
    private static final LineInfo PREMETRO = new LineInfo(7, TransportMode.PREMETRO, "P", "Premetro");
    private static final LineInfo MITRE = new LineInfo(9, TransportMode.TREN, "MITRE", "Mitre");

    private static Target target(long id, Set<Long> lines, Set<String> kinds, Integer lastTrain) {
        return new Target(id, lines, kinds, lastTrain, Set.of());
    }

    private static OffsetDateTime at(int day, int hour) {
        return ZonedDateTime.of(2026, 10, day, hour, 0, 0, 0, NotificationService.BUENOS_AIRES).toOffsetDateTime();
    }

    @Test
    void clima() {
        WeatherAlert vigente = new WeatherAlert("x1", "TORMENTAS", "AMARILLA", "Tormentas", "", "", at(29, 9), at(29, 21), List.of());
        WeatherAlert manana = new WeatherAlert("x2", "CALOR", "NARANJA", "Calor", "", "", at(30, 12), at(31, 18), List.of());
        WeatherAlert vencida = new WeatherAlert("x3", "LLUVIAS", "AMARILLA", "Lluvias", "", "", at(28, 9), at(29, 12), List.of());
        List<Target> targets = List.of(target(1, Set.of(), Set.of("clima"), null), target(2, Set.of(), Set.of("lineas"), null));

        List<Planned> out = ExtraNotices.weather(List.of(vigente, manana, vencida), targets, SITE, NOW);
        assertThat(out.size()).isEqualTo(2);
        Planned first = out.get(0);
        assertThat(first.subscriptionId()).isEqualTo(1L);
        assertThat(first.eventKey()).isEqualTo("clima:TORMENTAS:AMARILLA:20261029");
        assertThat(first.message().title()).isEqualTo("Alerta amarilla por tormentas");
        assertThat(first.message().body()).isEqualTo(
                "Rige hasta las 21:00. Si vas a viajar, llevá paraguas y salí con tiempo: puede haber demoras.");
        assertThat(first.message().icon()).isEqualTo(SITE + "/notif/clima-tormentas.png");

        Planned second = out.get(1);
        assertThat(second.eventKey()).isEqualTo("clima:CALOR:NARANJA:20261030");
        assertThat(second.message().title()).isEqualTo("Alerta naranja por calor extremo");
        assertThat(second.message().body()).isEqualTo(
                "Desde mañana a las 12:00 hasta el sábado a las 18:00. Si viajás mañana, llevá agua y evitá el sol del mediodía.");
    }

    @Test
    void climaSoloParaLasZonasQueAlcanza() {
        WeatherAlert amarilla = new WeatherAlert("a1", "TORMENTAS", "AMARILLA", "Tormentas", "", "", at(29, 9), at(29, 21), List.of());
        WeatherAlert naranja = new WeatherAlert("a2", "TORMENTAS", "NARANJA", "Tormentas", "", "", at(29, 9), at(29, 21), List.of());
        NoticeZones.Zone casa = new NoticeZones.Zone("casa", -34.6, -58.65);
        NoticeZones.Zone trabajo = new NoticeZones.Zone("trabajo", -34.6, -58.4);
        Target sinZona = target(1, Set.of(), Set.of("clima"), null);
        Target conZonas = new Target(2, Set.of(), Set.of("clima"), null, Set.of(), List.of(casa, trabajo));
        Target lejos = new Target(3, Set.of(), Set.of("clima"), null, Set.of(), List.of(new NoticeZones.Zone("casa", -35.0, -58.0)));

        // La naranja alcanza solo Trabajo; la amarilla, Casa; ninguna llega a la zona de la suscripcion 3.
        List<Planned> out = ExtraNotices.weather(List.of(sinZona, conZonas, lejos), t -> t.zones().isEmpty()
                ? List.of(naranja)
                : ExtraNotices.strongestByKind(t.zones().stream()
                        .map(z -> z == trabajo ? List.of(naranja) : z == casa ? List.of(amarilla) : List.<WeatherAlert>of())
                        .toList()), SITE, NOW);

        assertThat(out.size()).isEqualTo(2);
        assertThat(out.get(0).subscriptionId()).isEqualTo(1L);
        assertThat(out.get(1).subscriptionId()).isEqualTo(2L);
        assertThat(out.get(1).eventKey()).isEqualTo("clima:TORMENTAS:NARANJA:20261029");
    }

    private static FareRow fare(TransportMode mode, String jurisdiction, String minKm, Integer section, Integer tripsFrom, String price) {
        return new FareRow(mode, jurisdiction, minKm == null ? null : new BigDecimal(minKm),
                section == null ? null : section.shortValue(), tripsFrom == null ? null : tripsFrom.shortValue(),
                new BigDecimal(price), LocalDate.of(2026, 10, 1));
    }

    @Test
    void tarifasDeReferencia() {
        Map<String, BigDecimal> ref = ExtraNotices.referenceFares(List.of(
                fare(TransportMode.SUBTE, null, null, null, 1, "1817"),
                fare(TransportMode.SUBTE, null, null, null, 21, "1453.6"),
                fare(TransportMode.COLECTIVO, "NACIONAL", "0", null, null, "742.81"),
                fare(TransportMode.COLECTIVO, "NACIONAL", "3", null, null, "861.66"),
                fare(TransportMode.COLECTIVO, "CABA", "0", null, null, "920.48"),
                fare(TransportMode.TREN, null, null, 2, null, "640"),
                fare(TransportMode.TREN, null, null, 1, null, "450"),
                fare(TransportMode.PREMETRO, null, null, null, null, "635.95")));
        assertThat(ExtraNotices.encode(ref)).isEqualTo(
                "Subte=1817.00;Colectivo nacional=742.81;Colectivo de la Ciudad=920.48;Tren=450.00;Premetro=635.95");
        assertThat(ExtraNotices.decode(ExtraNotices.encode(ref))).isEqualTo(ref);
        assertThat(ExtraNotices.decode("roto;Subte=abc;Tren=1").keySet()).isEqualTo(Set.of("Tren"));
    }

    @Test
    void cambioDeTarifas() {
        Map<String, BigDecimal> before = ExtraNotices.decode("Subte=1453.60;Tren=450.00;Premetro=635.95");
        Map<String, BigDecimal> after = ExtraNotices.decode("Subte=1600.00;Tren=500.00;Premetro=635.95;Colectivo nacional=800");
        List<FareChange> changes = ExtraNotices.fareChanges(before, after);
        assertThat(changes.size()).isEqualTo(2);

        List<Target> targets = List.of(target(1, Set.of(), Set.of("tarifas"), null), target(2, Set.of(), Set.of("clima"), null));
        List<Planned> out = ExtraNotices.fares(changes, LocalDate.of(2026, 11, 1), "tarifas:abc", targets, SITE, NOW.toLocalDate());
        assertThat(out.size()).isEqualTo(1);
        assertThat(out.get(0).message().title()).isEqualTo("Aumentan las tarifas el 1 de noviembre");
        assertThat(out.get(0).message().body()).isEqualTo("Subte $1.453,60 ››› $1.600,00 · Tren $450,00 ››› $500,00.");
        assertThat(out.get(0).message().url()).isEqualTo(SITE + "/sube");

        // Rigen desde hoy y uno baja: "Cambian", sin fecha.
        List<FareChange> mixed = List.of(new FareChange("Subte", new BigDecimal("10"), new BigDecimal("12")),
                new FareChange("Tren", new BigDecimal("10"), new BigDecimal("9")));
        assertThat(ExtraNotices.faresTitle(mixed, NOW.toLocalDate(), NOW.toLocalDate())).isEqualTo("Cambian las tarifas");
        assertThat(ExtraNotices.fares(List.of(), null, "k", targets, SITE, NOW.toLocalDate()).size()).isEqualTo(0);
    }

    @Test
    void serviciosEspeciales() {
        List<SpecialItem> items = List.of(
                new SpecialItem(5, 9, SpecialServiceKind.ESPECIAL, "Tren rápido a Tigre", "Sábados", "8 a 12 h"),
                new SpecialItem(6, 2, SpecialServiceKind.CAMBIO, "Sin parada en Medrano por obras", null, null));
        List<Target> targets = List.of(
                target(1, Set.of(9L), Set.of("especiales"), null),
                target(2, Set.of(9L, 2L), Set.of("lineas"), null),
                target(3, Set.of(2L), Set.of("especiales"), null));
        List<Planned> out = ExtraNotices.specials(items, Map.of(2L, LINE_B, 9L, MITRE), targets, SITE);
        assertThat(out.size()).isEqualTo(2);
        assertThat(out.get(0).subscriptionId()).isEqualTo(1L);
        assertThat(out.get(0).eventKey()).isEqualTo("especial:5");
        assertThat(out.get(0).message().title()).isEqualTo("Tren Mitre: servicio especial");
        assertThat(out.get(0).message().body()).isEqualTo("Tren rápido a Tigre (Sábados, 8 a 12 h).");
        assertThat(out.get(1).subscriptionId()).isEqualTo(3L);
        assertThat(out.get(1).message().title()).isEqualTo("Línea B: cambio en el servicio");
        assertThat(out.get(1).message().icon()).isEqualTo(SITE + "/notif/linea-subte-b.png");
    }

    @Test
    void ultimoTren() {
        // Jueves: el primero de los ultimos de la B sale 23:00 de Juan Manuel de Rosas.
        List<Target> targets = List.of(
                target(1, Set.of(2L, 9L), Set.of(), 30),
                target(2, Set.of(2L), Set.of(), null),
                target(3, Set.of(7L), Set.of(), 15));
        Map<Long, LineInfo> lines = Map.of(2L, LINE_B, 7L, PREMETRO, 9L, MITRE);

        List<Planned> at2230 = ExtraNotices.lastTrains(targets, lines, LocalDateTime.of(2026, 10, 29, 22, 30), SITE);
        assertThat(at2230.size()).isEqualTo(1);
        assertThat(at2230.get(0).eventKey()).isEqualTo("ultimo:B:20261029");
        assertThat(at2230.get(0).message().title()).isEqualTo("Último subte de la Línea B en 30 minutos");
        assertThat(at2230.get(0).message().body()).isEqualTo(
                "Sale de Juan Manuel de Rosas a las 23:00 y de Leandro N. Alem a las 23:32 (puede variar 5 minutos).");
        assertThat(ExtraNotices.lastTrains(targets, lines, LocalDateTime.of(2026, 10, 29, 22, 41), SITE).size()).isEqualTo(0);

        // Premetro, 15 minutos antes del primero (20:49 los jueves).
        List<Planned> premetro = ExtraNotices.lastTrains(targets, lines, LocalDateTime.of(2026, 10, 29, 20, 34), SITE);
        assertThat(premetro.size()).isEqualTo(1);
        assertThat(premetro.get(0).message().title()).isEqualTo("Último Premetro en 15 minutos");
        assertThat(ExtraNotices.lastTrainTitle(LINE_B, 60)).isEqualTo("Último subte de la Línea B en una hora");
    }

    @Test
    void horariosDelUltimoTren() {
        // Sabado: la H sale 00:20 de Hospitales; el dia de servicio sigue siendo el sabado.
        LocalDate saturday = LocalDate.of(2026, 10, 31);
        assertThat(LastTrains.departures("H", saturday).get(1).time()).isEqualTo("00:20");
        // Domingo y feriado usan el horario del domingo (23/11/2026 es feriado, lunes).
        assertThat(LastTrains.departures("B", LocalDate.of(2026, 11, 23)).get(0).time()).isEqualTo("22:00");
        assertThat(LastTrains.departures("B", LocalDate.of(2026, 11, 24)).get(0).time()).isEqualTo("23:00");
        // Viernes a las 00:05 todavia es el jueves de servicio: nada pendiente a esa hora.
        assertThat(LastTrains.due("B", 15, LocalDateTime.of(2026, 10, 30, 0, 5)).isPresent()).isEqualTo(false);
        // La D del sabado (00:01 desde Catedral, 23:30 desde Congreso de Tucumán): 15 minutos antes de las 23:30.
        var due = LastTrains.due("D", 15, LocalDateTime.of(2026, 10, 31, 23, 15));
        assertThat(due.isPresent()).isEqualTo(true);
        assertThat(due.get().serviceDay()).isEqualTo(saturday);
        assertThat(LastTrains.hasData("PREMETRO")).isEqualTo(true);
        assertThat(LastTrains.hasData("MITRE")).isEqualTo(false);
    }

    @Test
    void pausas() {
        // Jueves 15:00.
        assertThat(NotificationService.pauseEnd("hora", NOW)).isEqualTo(NOW.plusHours(1).toInstant());
        assertThat(NotificationService.pauseEnd("manana", NOW))
                .isEqualTo(ZonedDateTime.of(2026, 10, 30, 6, 0, 0, 0, NotificationService.BUENOS_AIRES).toInstant());
        assertThat(NotificationService.pauseEnd("lunes", NOW))
                .isEqualTo(ZonedDateTime.of(2026, 11, 2, 6, 0, 0, 0, NotificationService.BUENOS_AIRES).toInstant());
        // A las 2 de la mañana, "hasta mañana" es hoy a las 6.
        ZonedDateTime early = NOW.withHour(2);
        assertThat(NotificationService.pauseEnd("manana", early))
                .isEqualTo(ZonedDateTime.of(2026, 10, 29, 6, 0, 0, 0, NotificationService.BUENOS_AIRES).toInstant());
    }

    @Test
    void avisosDeColectivos() {
        List<ExtraNotices.BusNotice> notices = List.of(
                new ExtraNotices.BusNotice(List.of("152"), "Línea 152: Desvío por obras", "Por obras en Av. Santa Fe, desvío por Charcas."),
                new ExtraNotices.BusNotice(List.of("12", "37"), "AUSA corte parcial", "Las líneas 12 y 37 no pasan por Pueyrredón."),
                new ExtraNotices.BusNotice(List.of("60"), "Línea 60", ""));
        List<Target> targets = List.of(
                new Target(1, Set.of(), Set.of("colectivos"), null, Set.of("152", "37")),
                new Target(2, Set.of(), Set.of("lineas"), null, Set.of("152")),
                new Target(3, Set.of(), Set.of("colectivos"), null, Set.of("53A")));
        List<Planned> out = ExtraNotices.busNotices(notices, targets, SITE);
        assertThat(out.size()).isEqualTo(2);
        assertThat(out.get(0).subscriptionId()).isEqualTo(1L);
        assertThat(out.get(0).message().title()).isEqualTo("Línea 152: desvío por obras");
        assertThat(out.get(0).message().body()).isEqualTo("Por obras en Av. Santa Fe, desvío por Charcas.");
        assertThat(out.get(0).message().url()).isEqualTo(SITE + "/colectivos?linea=152");
        assertThat(out.get(0).message().icon()).isEqualTo(SITE + "/notif/colectivo.png");
        assertThat(out.get(1).message().title()).isEqualTo("Línea 37: AUSA corte parcial");
        // La clave sale del texto: el mismo aviso no se repite.
        assertThat(out.get(0).eventKey()).isEqualTo(ExtraNotices.busNotices(notices.subList(0, 1), targets, SITE).get(0).eventKey());

        assertThat(ExtraNotices.busNumber("53A")).isEqualTo("53");
        assertThat(ExtraNotices.busNumber("007")).isEqualTo("7");
        assertThat(ExtraNotices.busNumber("BSAS")).isEqualTo(null);
        assertThat(ExtraNotices.withoutLinePrefix("Líneas 12, 37 y 60 - Corte")).isEqualTo("Corte");
        assertThat(ExtraNotices.withoutLinePrefix("Línea 60")).isEqualTo("");
    }
}
