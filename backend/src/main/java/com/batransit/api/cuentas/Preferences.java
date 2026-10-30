package com.batransit.api.cuentas;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Preferencias que se sincronizan con la cuenta: el tema y las de avisos.
 * Lo que no es valido se descarta (queda null y el sitio usa su valor por
 * defecto). La pausa no se sincroniza: es de cada dispositivo.
 */
public final class Preferences {

    private Preferences() {
    }

    /** tema: "light" | "dark" | null (el del sistema). */
    public record Prefs(String tema, Notices avisos) {
        public static Prefs empty() {
            return new Prefs(null, null);
        }
    }

    /** Las mismas claves que guarda el sitio (frontend/src/utils/push.js). */
    public record Notices(Integer version, List<String> kinds, Boolean notifyResolved, Boolean quiet, Integer quietFrom,
                          Integer quietTo, Boolean summary, String summaryTime, List<Integer> summaryDays,
                          Boolean lastTrain, Integer lastTrainMinutes) {
    }

    static final Set<String> THEMES = Set.of("light", "dark");
    static final Set<String> KINDS = Set.of("lineas", "estaciones", "accesos", "clima", "tarifas", "especiales");
    static final Set<Integer> LAST_TRAIN = Set.of(15, 30, 45, 60);
    private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

    public static Prefs sanitize(Prefs p) {
        if (p == null) {
            return Prefs.empty();
        }
        return new Prefs(p.tema() != null && THEMES.contains(p.tema()) ? p.tema() : null, notices(p.avisos()));
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
                n.lastTrainMinutes() != null && LAST_TRAIN.contains(n.lastTrainMinutes()) ? n.lastTrainMinutes() : null);
    }

    private static Integer hour(Integer h) {
        return h != null && h >= 0 && h <= 23 ? h : null;
    }
}
