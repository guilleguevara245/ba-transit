package com.batransit.api.notificaciones;

import java.text.Normalizer;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Si el texto de una alerta nombra a una estacion. Misma logica que el
 * sitio (frontend/src/utils/stationAlerts.js), asi el aviso coincide con
 * lo que se ve en la pagina de la estacion.
 */
public final class StationMatcher {

    private static final Pattern MARKER = Pattern.compile("\\bestacion(es)?\\b");
    private static final Pattern PREFIX = Pattern.compile("^(general|gral\\.?|plaza|avenida|av\\.?)\\s+");
    private static final Pattern CLOSED = Pattern.compile(
            "cerrad|sin parada|no se detiene|no se detienen|no paran|no para |pasan sin detenerse");

    private StationMatcher() {
    }

    static String normalize(String text) {
        String t = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return t.toLowerCase(Locale.ROOT).strip();
    }

    /** Las formas en que una alerta puede nombrar a la estacion (sin las muy cortas). */
    static List<String> aliases(String stationName) {
        String full = normalize(stationName);
        String[] parts = full.split("\\s+-\\s+");
        Set<String> out = new LinkedHashSet<>();
        out.add(full);
        for (String p : parts) {
            out.add(p);
            out.add(PREFIX.matcher(p).replaceFirst(""));
        }
        return out.stream().filter(a -> a.length() >= 4).toList();
    }

    public static boolean mentions(String alertText, String stationName) {
        String full = normalize(alertText);
        Matcher marker = MARKER.matcher(full);
        String haystack = marker.find() ? full.substring(marker.start()) : full;
        for (String alias : aliases(stationName)) {
            Pattern word = Pattern.compile("(^|[^\\p{L}\\d])" + Pattern.quote(alias) + "($|[^\\p{L}\\d])");
            if (word.matcher(haystack).find()) {
                return true;
            }
        }
        return false;
    }

    /** Si la alerta dice que la estacion esta cerrada o que los trenes no paran. */
    public static boolean saysClosed(String alertText) {
        return CLOSED.matcher(normalize(alertText) + " ").find();
    }
}
