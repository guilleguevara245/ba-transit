package com.batransit.api.cuentas;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Preferencias que se sincronizan con la cuenta: el tema, las de avisos y
 * la zona del clima.
 * Lo que no es valido se descarta (queda null y el sitio usa su valor por
 * defecto). La pausa no se sincroniza: es de cada dispositivo.
 */
public final class Preferences {

    private Preferences() {
    }

    /** tema: "light" | "dark" | null (el del sistema). clima: la zona del clima (o null). */
    public record Prefs(String tema, Notices avisos, Zone clima) {
        public Prefs(String tema, Notices avisos) {
            this(tema, avisos, null);
        }

        public static Prefs empty() {
            return new Prefs(null, null, null);
        }
    }

    /**
     * Zona del clima de quien no tiene Casa guardada: un nombre y la celda de
     * la grilla de 0,05 grados (unos 5 km), nunca un punto exacto.
     */
    public record Zone(String nombre, Double lat, Double lon) {
    }

    static final int MAX_ZONE_NAME = 40;

    /** Las mismas claves que guarda el sitio (frontend/src/utils/push.js). */
    public record Notices(Integer version, List<String> kinds, Boolean notifyResolved, Boolean quiet, Integer quietFrom,
                          Integer quietTo, Boolean summary, String summaryTime, List<Integer> summaryDays,
                          Boolean lastTrain, Integer lastTrainMinutes, Boolean tripWeather, String tripWeatherTime) {

        public Notices(Integer version, List<String> kinds, Boolean notifyResolved, Boolean quiet, Integer quietFrom,
                       Integer quietTo, Boolean summary, String summaryTime, List<Integer> summaryDays,
                       Boolean lastTrain, Integer lastTrainMinutes) {
            this(version, kinds, notifyResolved, quiet, quietFrom, quietTo, summary, summaryTime, summaryDays, lastTrain,
                    lastTrainMinutes, null, null);
        }
    }

    static final Set<String> THEMES = Set.of("light", "dark");
    static final Set<String> KINDS = Set.of("lineas", "estaciones", "accesos", "clima", "tarifas", "especiales",
            "colectivos");
    static final Set<Integer> LAST_TRAIN = Set.of(15, 30, 45, 60);
    private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

    public static Prefs sanitize(Prefs p) {
        if (p == null) {
            return Prefs.empty();
        }
        return new Prefs(p.tema() != null && THEMES.contains(p.tema()) ? p.tema() : null, notices(p.avisos()),
                zone(p.clima()));
    }

    /** La zona valida (nombre corto, dentro del AMBA) y redondeada a la grilla, o null. */
    static Zone zone(Zone z) {
        if (z == null || z.nombre() == null || z.lat() == null || z.lon() == null) {
            return null;
        }
        String name = z.nombre().replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").strip();
        if (name.isEmpty() || !com.batransit.api.clima.ForecastService.inArea(z.lat(), z.lon())) {
            return null;
        }
        name = name.length() > MAX_ZONE_NAME ? name.substring(0, MAX_ZONE_NAME).strip() : name;
        return new Zone(name, Math.round(z.lat() * 20) / 20.0, Math.round(z.lon() * 20) / 20.0);
    }

    static Notices notices(Notices n) {
        if (n == null) {
            return null;
        }
        List<String> kinds = n.kinds() == null ? null
                : n.kinds().stream().filter(Objects::nonNull).filter(KINDS::contains).distinct().toList();
        List<Integer> days = n.summaryDays() == null ? null
                : n.summaryDays().stream().filter(d -> d != null && d >= 1 && d <= 7).distinct().sorted().toList();
        return new Notices(
                n.version() != null && n.version() >= 1 && n.version() <= 99 ? n.version() : null,
                kinds,
                n.notifyResolved(),
                n.quiet(),
                hour(n.quietFrom()),
                hour(n.quietTo()),
                n.summary(),
                n.summaryTime() != null && TIME.matcher(n.summaryTime()).matches() ? n.summaryTime() : null,
                days == null || days.isEmpty() ? null : days,
                n.lastTrain(),
                n.lastTrainMinutes() != null && LAST_TRAIN.contains(n.lastTrainMinutes()) ? n.lastTrainMinutes() : null,
                n.tripWeather(),
                n.tripWeatherTime() != null && TIME.matcher(n.tripWeatherTime()).matches() ? n.tripWeatherTime() : null);
    }

    private static Integer hour(Integer h) {
        return h != null && h >= 0 && h <= 23 ? h : null;
    }
}
