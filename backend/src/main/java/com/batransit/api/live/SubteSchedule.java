package com.batransit.api.live;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Horario programado del subte y el premetro, a partir del GTFS estatico
 * de la API Transporte (/subtes/feed-gtfs).
 *
 * Ese GTFS no trae tren por tren: cada linea tiene un viaje "modelo" por
 * sentido y tipo de dia (stop_times, con el tiempo entre estaciones) y
 * franjas horarias con la frecuencia (frequencies.txt, exact_times=1:
 * sale un tren de la cabecera cada headway_secs desde start_time). Con
 * eso se calculan las proximas pasadas por una estacion.
 */
public final class SubteSchedule {

    static final int MAX_PER_DIRECTION = 3;
    private static final DateTimeFormatter GTFS_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    /** Nombres de la base que en el GTFS estan escritos distinto (ya normalizados). */
    private static final Map<String, String> ALIASES = Map.of(
            "avenida la plata", "la plata",
            "nuestra senora de fatima", "ntra sra de fatima",
            "centro civico lugano", "centro civico",
            "humberto i", "humberto 1");

    record Frequency(int start, int end, int headway) {
    }

    record Trip(String id, String lineCode, String serviceId, String headsign, int directionId,
                List<String> stops, List<Integer> offsets, List<Frequency> frequencies) {
    }

    record Service(boolean[] days, LocalDate from, LocalDate to) {
    }

    public record Arrival(int minutes, boolean estimated) {
    }

    /** headwayMinutes: frecuencia de la franja actual (null si ya no hay servicio en ese sentido). */
    public record Direction(int directionId, String towards, Integer headwayMinutes, List<Arrival> arrivals) {
    }

    private final List<Trip> trips;
    private final Map<String, Service> services;
    /** service_id -> fecha -> true (agregado) / false (quitado). */
    private final Map<String, Map<LocalDate, Boolean>> exceptions;

    private SubteSchedule(List<Trip> trips, Map<String, Service> services,
                          Map<String, Map<LocalDate, Boolean>> exceptions) {
        this.trips = trips;
        this.services = services;
        this.exceptions = exceptions;
    }

    public int tripCount() {
        return trips.size();
    }

    /** Lee el .zip del GTFS. */
    public static SubteSchedule parse(byte[] zip) throws IOException {
        Map<String, List<Map<String, String>>> files = new HashMap<>();
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            ZipEntry entry;
            while ((entry = in.getNextEntry()) != null) {
                String name = entry.getName().substring(entry.getName().lastIndexOf('/') + 1);
                if (Set.of("routes.txt", "trips.txt", "stop_times.txt", "stops.txt", "frequencies.txt",
                        "calendar.txt", "calendar_dates.txt").contains(name)) {
                    files.put(name, readCsv(in));
                }
            }
        }
        for (String required : List.of("routes.txt", "trips.txt", "stop_times.txt", "stops.txt", "frequencies.txt")) {
            if (!files.containsKey(required)) {
                throw new IOException("El GTFS no tiene " + required);
            }
        }

        Map<String, String> lineByRoute = new HashMap<>();
        for (Map<String, String> r : files.get("routes.txt")) {
            String shortName = r.getOrDefault("route_short_name", "");
            // Premetro: PM-C y PM-S son la linea P de la base.
            lineByRoute.put(r.get("route_id"), shortName.startsWith("PM") ? "P" : shortName.toUpperCase(Locale.ROOT));
        }
        Map<String, String> stopNames = new HashMap<>();
        for (Map<String, String> s : files.get("stops.txt")) {
            stopNames.put(s.get("stop_id"), normalize(s.getOrDefault("stop_name", "")));
        }

        Map<String, List<String[]>> timesByTrip = new LinkedHashMap<>();
        for (Map<String, String> st : files.get("stop_times.txt")) {
            timesByTrip.computeIfAbsent(st.get("trip_id"), k -> new ArrayList<>())
                    .add(new String[] {st.get("stop_sequence"), st.get("stop_id"), st.get("arrival_time")});
        }
        Map<String, List<Frequency>> freqByTrip = new HashMap<>();
        for (Map<String, String> f : files.get("frequencies.txt")) {
            freqByTrip.computeIfAbsent(f.get("trip_id"), k -> new ArrayList<>()).add(new Frequency(
                    seconds(f.get("start_time")), seconds(f.get("end_time")),
                    Integer.parseInt(f.get("headway_secs").trim())));
        }

        List<Trip> trips = new ArrayList<>();
        for (Map<String, String> t : files.get("trips.txt")) {
            String id = t.get("trip_id");
            List<String[]> times = timesByTrip.get(id);
            List<Frequency> freqs = freqByTrip.get(id);
            String line = lineByRoute.get(t.get("route_id"));
            if (times == null || freqs == null || line == null) {
                continue;
            }
            times.sort((a, b) -> Integer.compare(Integer.parseInt(a[0].trim()), Integer.parseInt(b[0].trim())));
            int first = seconds(times.get(0)[2]);
            List<String> stops = new ArrayList<>();
            List<Integer> offsets = new ArrayList<>();
            for (String[] time : times) {
                stops.add(stopNames.getOrDefault(time[1], ""));
                offsets.add(seconds(time[2]) - first);
            }
            freqs.sort((a, b) -> Integer.compare(a.start(), b.start()));
            trips.add(new Trip(id, line, t.get("service_id"), t.getOrDefault("trip_headsign", ""),
                    parseInt(t.get("direction_id")), List.copyOf(stops), List.copyOf(offsets), List.copyOf(freqs)));
        }

        Map<String, Service> services = new HashMap<>();
        for (Map<String, String> c : files.getOrDefault("calendar.txt", List.of())) {
            boolean[] days = new boolean[7];
            String[] cols = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"};
            for (int i = 0; i < 7; i++) {
                days[i] = "1".equals(c.getOrDefault(cols[i], "0").trim());
            }
            services.put(c.get("service_id"), new Service(days,
                    LocalDate.parse(c.get("start_date").trim(), GTFS_DATE),
                    LocalDate.parse(c.get("end_date").trim(), GTFS_DATE)));
        }
        Map<String, Map<LocalDate, Boolean>> exceptions = new HashMap<>();
        for (Map<String, String> d : files.getOrDefault("calendar_dates.txt", List.of())) {
            exceptions.computeIfAbsent(d.get("service_id"), k -> new HashMap<>())
                    .put(LocalDate.parse(d.get("date").trim(), GTFS_DATE), "1".equals(d.get("exception_type").trim()));
        }
        return new SubteSchedule(List.copyOf(trips), services, exceptions);
    }

    /** Proximas pasadas por la estacion (hora local de Buenos Aires), por sentido. */
    public List<Direction> nextArrivals(String lineCode, String stationName, LocalDateTime now) {
        String line = lineCode.trim().toUpperCase(Locale.ROOT);
        String station = canonical(stationName);
        int nowSeconds = now.toLocalTime().toSecondOfDay();
        Set<String> active = activeServices(now.toLocalDate());

        Map<String, Direction> byTowards = new LinkedHashMap<>();
        for (Trip trip : trips) {
            if (!trip.lineCode().equals(line) || !active.contains(trip.serviceId())) {
                continue;
            }
            int index = indexOf(trip.stops(), station);
            // En la cabecera de llegada no sale ningun tren en ese sentido.
            if (index < 0 || index == trip.stops().size() - 1) {
                continue;
            }
            int offset = trip.offsets().get(index);
            List<Integer> times = new ArrayList<>();
            Integer headway = null;
            for (Frequency f : trip.frequencies()) {
                // Franja vigente: la que cubre ahora la salida desde la cabecera de un tren que pasa ahora.
                if (headway == null && nowSeconds - offset >= f.start() && nowSeconds - offset < f.end()) {
                    headway = f.headway();
                }
                for (int departure = f.start(); departure < f.end(); departure += f.headway()) {
                    int arrival = departure + offset;
                    if (arrival >= nowSeconds) {
                        times.add(arrival);
                    }
                }
            }
            times.sort(Integer::compare);
            String towards = trip.headsign();
            Direction previous = byTowards.get(towards);
            List<Arrival> arrivals = new ArrayList<>(previous == null ? List.of() : previous.arrivals());
            for (int time : times.subList(0, Math.min(MAX_PER_DIRECTION, times.size()))) {
                arrivals.add(new Arrival((time - nowSeconds) / 60, true));
            }
            arrivals.sort((a, b) -> Integer.compare(a.minutes(), b.minutes()));
            Integer minutes = headway == null ? null : Math.max(1, Math.round(headway / 60f));
            if (previous != null && previous.headwayMinutes() != null) {
                // Premetro hacia Saguier: los dos ramales comparten el tramo; se toma la menor frecuencia.
                minutes = minutes == null ? previous.headwayMinutes() : Math.min(minutes, previous.headwayMinutes());
            }
            byTowards.put(towards, new Direction(trip.directionId(), towards, minutes,
                    List.copyOf(arrivals.subList(0, Math.min(MAX_PER_DIRECTION, arrivals.size())))));
        }
        return List.copyOf(byTowards.values());
    }

    /** Servicios del dia: calendario + excepciones (feriados). Pasado el fin del GTFS, se usa el dia de la semana. */
    Set<String> activeServices(LocalDate date) {
        Set<String> active = new java.util.HashSet<>();
        boolean anyInRange = services.values().stream().anyMatch(s -> !date.isBefore(s.from()) && !date.isAfter(s.to()));
        int day = date.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue();
        services.forEach((id, s) -> {
            boolean inRange = !anyInRange || (!date.isBefore(s.from()) && !date.isAfter(s.to()));
            if (s.days()[day] && inRange) {
                active.add(id);
            }
        });
        exceptions.forEach((id, dates) -> {
            Boolean added = dates.get(date);
            if (Boolean.TRUE.equals(added)) {
                active.add(id);
            } else if (Boolean.FALSE.equals(added)) {
                active.remove(id);
            }
        });
        return active;
    }

    private static int indexOf(List<String> stops, String station) {
        int index = stops.indexOf(station);
        if (index < 0) {
            int dash = station.indexOf(" - ");
            if (dash > 0) {
                index = stops.indexOf(station.substring(0, dash).trim());
            }
        }
        return index;
    }

    static String canonical(String stationName) {
        String name = normalize(stationName);
        String alias = ALIASES.get(name);
        if (alias != null) {
            return alias;
        }
        // "Once - 30 de Diciembre", "Plaza de los Virreyes - Eva Peron": en el GTFS va la primera parte.
        int dash = stationName.indexOf(" - ");
        if (dash > 0) {
            String first = normalize(stationName.substring(0, dash));
            return ALIASES.getOrDefault(first, first);
        }
        return name;
    }

    /** Minusculas, sin tildes ni puntuacion: "Ntra. Sra. de Fátima" -> "ntra sra de fatima". */
    static String normalize(String text) {
        String plain = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return plain.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    /** "5:30:00" -> 19800. */
    static int seconds(String time) {
        String[] parts = time.trim().split(":");
        return Integer.parseInt(parts[0]) * 3600 + Integer.parseInt(parts[1]) * 60
                + (parts.length > 2 ? Integer.parseInt(parts[2]) : 0);
    }

    private static int parseInt(String value) {
        try {
            return value == null ? 0 : Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** CSV simple con comillas (los textos del GTFS pueden tener comas entre comillas). */
    static List<Map<String, String>> readCsv(InputStream in) throws IOException {
        String text = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        if (text.startsWith("﻿")) {
            text = text.substring(1);
        }
        List<Map<String, String>> rows = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");
        if (lines.length == 0) {
            return rows;
        }
        List<String> header = splitCsv(lines[0]);
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isBlank()) {
                continue;
            }
            List<String> cols = splitCsv(lines[i]);
            Map<String, String> row = new HashMap<>();
            for (int c = 0; c < header.size(); c++) {
                row.put(header.get(c).trim(), c < cols.size() ? cols.get(c) : "");
            }
            rows.add(row);
        }
        return rows;
    }

    private static List<String> splitCsv(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cur.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch == ',' && !quoted) {
                out.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(ch);
            }
        }
        out.add(cur.toString());
        return out;
    }
}
