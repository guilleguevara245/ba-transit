package com.batransit.api.notificaciones;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Ultimos trenes de subte y Premetro desde cada cabecera, los mismos del
 * sitio (frontend/src/utils/serviceHours.js; fuente: Emova, octubre de
 * 2026, con una variacion de +/- 5 minutos). Los feriados usan el horario
 * de los domingos (lista de frontend/src/utils/holidays.js).
 */
public final class LastTrains {

    private LastTrains() {
    }

    /** Ultimo tren desde una cabecera; minutes: minutos desde las 0 del dia de servicio (las 00:20 son 24*60+20). */
    public record Departure(String from, int minutes) {

        /** "23:32", "00:01". */
        public String time() {
            int m = minutes % (24 * 60);
            return String.format("%02d:%02d", m / 60, m % 60);
        }
    }

    /** El aviso que toca: que linea, de que dia de servicio y sus ultimos trenes (el primero, el que sale antes). */
    public record Due(String code, LocalDate serviceDay, List<Departure> departures) {
    }

    /** Pasada esta hora (04:00), ya es otro dia de servicio. */
    static final int DAY_STARTS = 4 * 60;
    /** Cuanto despues de la hora justa todavia se manda (por si el servidor estaba ocupado). */
    static final int WINDOW = 10;

    // [cabecera, lun-vie, sabados, domingos y feriados]
    private static final Map<String, String[][]> TABLE = Map.of(
            "A", new String[][]{{"San Pedrito", "23:00", "23:30", "22:08"}, {"Plaza de Mayo", "23:26", "23:57", "22:36"}},
            "B", new String[][]{{"Leandro N. Alem", "23:32", "23:56", "22:31"}, {"Juan Manuel de Rosas", "23:00", "23:25", "22:00"}},
            "C", new String[][]{{"Constitución", "23:19", "23:40", "22:21"}, {"Retiro", "23:33", "23:54", "22:34"}},
            "D", new String[][]{{"Congreso de Tucumán", "23:00", "23:30", "22:00"}, {"Catedral", "23:32", "00:01", "22:31"}},
            "E", new String[][]{{"Retiro", "23:30", "23:58", "22:28"}, {"Plaza de los Virreyes", "22:56", "23:26", "21:56"}},
            "H", new String[][]{{"Hospitales", "23:51", "00:20", "22:51"}, {"Facultad de Derecho", "23:30", "23:59", "22:29"}},
            "P", new String[][]{{"Intendente Saguier (a Lugano)", "21:00", "20:56", "21:00"},
                    {"Centro Cívico Lugano", "21:31", "21:26", "21:32"},
                    {"Intendente Saguier (a Savio)", "20:49", "21:07", "20:47"},
                    {"General Savio", "21:20", "21:36", "21:19"}});

    static final Set<LocalDate> HOLIDAYS = Set.of(
            "2026-01-01", "2026-02-16", "2026-02-17", "2026-03-23", "2026-03-24", "2026-04-02", "2026-04-03",
            "2026-05-01", "2026-05-25", "2026-06-15", "2026-06-20", "2026-07-09", "2026-07-10", "2026-08-17",
            "2026-10-12", "2026-11-23", "2026-12-07", "2026-12-08", "2026-12-25", "2027-01-01", "2027-02-08",
            "2027-02-09", "2027-03-24", "2027-03-26", "2027-04-02", "2027-05-01", "2027-05-25", "2027-06-20",
            "2027-06-21", "2027-07-09", "2027-08-16", "2027-10-11", "2027-11-20", "2027-12-08", "2027-12-25")
            .stream().map(LocalDate::parse).collect(java.util.stream.Collectors.toUnmodifiableSet());

    /** "P" y "PREMETRO" son la misma linea. */
    static String normalize(String code) {
        return code == null ? null : "PREMETRO".equalsIgnoreCase(code) ? "P" : code.toUpperCase(java.util.Locale.ROOT);
    }

    public static boolean hasData(String code) {
        return TABLE.containsKey(normalize(code));
    }

    /** 0 = lunes a viernes, 1 = sabado, 2 = domingo o feriado. */
    static int dayType(LocalDate day) {
        if (day.getDayOfWeek() == DayOfWeek.SUNDAY || HOLIDAYS.contains(day)) {
            return 2;
        }
        return day.getDayOfWeek() == DayOfWeek.SATURDAY ? 1 : 0;
    }

    /** Los ultimos trenes de la linea ese dia de servicio, del que sale antes al que sale despues. */
    public static List<Departure> departures(String code, LocalDate serviceDay) {
        String[][] rows = TABLE.get(normalize(code));
        if (rows == null) {
            return List.of();
        }
        int col = 1 + dayType(serviceDay);
        return java.util.Arrays.stream(rows)
                .map(r -> new Departure(r[0], minutes(r[col])))
                .sorted(Comparator.comparingInt(Departure::minutes))
                .toList();
    }

    /**
     * Si ahora toca avisar el ultimo tren de la linea, "before" minutos
     * antes del primero de los ultimos trenes (con una ventana de WINDOW
     * minutos). Pasada la medianoche sigue siendo el dia de servicio anterior.
     */
    public static Optional<Due> due(String code, int before, LocalDateTime now) {
        int clock = now.getHour() * 60 + now.getMinute();
        LocalDate serviceDay = clock < DAY_STARTS ? now.toLocalDate().minusDays(1) : now.toLocalDate();
        int minute = clock < DAY_STARTS ? clock + 24 * 60 : clock;
        List<Departure> list = departures(code, serviceDay);
        if (list.isEmpty()) {
            return Optional.empty();
        }
        int at = list.get(0).minutes() - before;
        return minute >= at && minute < at + WINDOW
                ? Optional.of(new Due(normalize(code), serviceDay, list))
                : Optional.empty();
    }

    static int minutes(String time) {
        int m = Integer.parseInt(time.substring(0, time.indexOf(':'))) * 60 + Integer.parseInt(time.substring(time.indexOf(':') + 1));
        return m < DAY_STARTS ? m + 24 * 60 : m;
    }
}
