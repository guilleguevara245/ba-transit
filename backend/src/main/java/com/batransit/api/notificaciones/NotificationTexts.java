package com.batransit.api.notificaciones;

import com.batransit.api.accesos.AccessModels.TrafficStatus;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.TransportMode;

import java.util.List;
import java.util.Locale;

/**
 * Los textos de cada tipo de aviso: lineas, estaciones y accesos, cada uno
 * con su formato (y su version "volvio a la normalidad").
 */
public final class NotificationTexts {

    static final int MAX_BODY = 180;

    private NotificationTexts() {
    }

    /** Datos de la linea que hacen falta para el aviso. */
    public record LineInfo(long id, TransportMode mode, String code, String name) {

        /** "Línea B", "Premetro", "Tren Sarmiento", "Tren de la Costa". */
        public String display() {
            return switch (mode) {
                case SUBTE -> name;
                case PREMETRO -> "Premetro";
                default -> name.startsWith("Tren") ? name : "Tren " + name.replaceFirst("^L[ií]nea\\s+", "");
            };
        }

        boolean feminine() {
            return mode == TransportMode.SUBTE;
        }

        /** "la Línea B", "el Tren Sarmiento". */
        String withArticle() {
            return (feminine() ? "la " : "el ") + display();
        }

        /** Igual que lineSlug del sitio: subte-b, premetro, san-martin (direccion e iconos). */
        String slug() {
            if (mode == TransportMode.PREMETRO || "P".equals(code) || "PREMETRO".equals(code)) {
                return "premetro";
            }
            if (mode == TransportMode.SUBTE) {
                return "subte-" + code.toLowerCase(Locale.ROOT);
            }
            return code.toLowerCase(Locale.ROOT).replace('_', '-');
        }
    }

    public static String lineTitle(LineInfo line, AlertType type) {
        String a = line.feminine() ? "a" : "o";
        return switch (type) {
            case DEMORA -> line.display() + " con demoras";
            case INTERRUPCION -> line.display() + " interrumpid" + a;
            case OBRA -> "Obras en " + line.withArticle();
            case DESVIO -> "Cambios en el servicio " + (line.feminine() ? "de la " : "del ") + line.display();
        };
    }

    public static String lineResolvedTitle(LineInfo line) {
        return line.display() + ": volvió a funcionar normal";
    }

    public static String lineResolvedBody(AlertType type) {
        return switch (type) {
            case DEMORA -> "Ya no hay demoras informadas.";
            case INTERRUPCION -> "El servicio volvió a funcionar.";
            case OBRA -> "Terminaron las obras informadas.";
            case DESVIO -> "El servicio volvió a su recorrido habitual.";
        };
    }

    public static String stationTitle(String station, boolean closed) {
        return closed ? "Tu estación " + station + " está cerrada" : "Aviso en tu estación " + station;
    }

    /** "Línea B · <aviso>. Las más cercanas: Carlos Gardel y Ángel Gallardo." */
    public static String stationBody(LineInfo line, String description, List<String> neighbors) {
        String text = line.display() + " · " + clean(description);
        if (!neighbors.isEmpty()) {
            text = endSentence(text) + " " + (neighbors.size() == 1 ? "La más cercana: " : "Las más cercanas: ")
                    + String.join(" y ", neighbors) + ".";
        }
        return shorten(text);
    }

    public static String stationResolvedTitle(String station, boolean wasClosed) {
        return wasClosed ? station + " volvió a abrir" : "Se resolvió el aviso en tu estación " + station;
    }

    public static String stationResolvedBody(LineInfo line, boolean wasClosed) {
        return line.display() + (wasClosed ? " · Los trenes ya paran en tu estación." : " · Ya no hay avisos para tu estación.");
    }

    // ---- Accesos ----

    /** "Acceso Norte (Panamericana)" -> "Acceso Norte"; con "/" se usa el tramo. */
    static String accessSubject(String accessName, String segmentName) {
        if (accessName.contains("/")) {
            return segmentName;
        }
        return accessName.replaceAll("\\s*\\(.*\\)\\s*", "").strip();
    }

    static boolean feminineRoad(String subject) {
        return subject.startsWith("Autopista") || subject.startsWith("Ruta") || subject.startsWith("Avenida");
    }

    /** "Entre General Paz y Morón" o "En Ramal Pilar". */
    static String segmentPhrase(String segment) {
        String[] ends = segment.split("\\s+[–-]\\s+");
        return ends.length == 2 ? "Entre " + ends[0] + " y " + ends[1] : "En " + segment;
    }

    public static String accessTitle(String accessName, String segment, String towards, TrafficStatus status) {
        String subject = accessSubject(accessName, segment);
        String a = feminineRoad(subject) ? "a" : "o";
        String state = status == TrafficStatus.CORTADO ? "cortad" + a : "congestionad" + a;
        return subject + " " + state + " hacia " + towards;
    }

    public static String accessBody(String segment, TrafficStatus status, Integer current, Integer normal) {
        if (status == TrafficStatus.CORTADO) {
            return "Tramo " + segment + " cortado. Buscá un camino alternativo.";
        }
        String speed = current == null ? "" : " se va a " + current + " km/h" + (normal == null ? "" : " (lo normal es " + normal + ")");
        return segmentPhrase(segment) + speed + ". Si podés, salí más tarde.";
    }

    public static String accessResolvedTitle(String accessName, String segment) {
        return accessSubject(accessName, segment) + " ya circula fluido";
    }

    public static String accessResolvedBody(String segment, String towards, Integer current) {
        String phrase = segmentPhrase(segment);
        String lower = Character.toLowerCase(phrase.charAt(0)) + phrase.substring(1);
        return "Hacia " + towards + ", " + lower + (current == null ? "." : ", a " + current + " km/h.");
    }

    /** Igual que textSlug del sitio: "Plaza de Mayo" -> "plaza-de-mayo". */
    static String textSlug(String text) {
        String t = java.text.Normalizer.normalize(text == null ? "" : text, java.text.Normalizer.Form.NFD)
                .replaceAll("[\\u0300-\\u036f]", "").toLowerCase(Locale.ROOT);
        return t.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    }

    // ---- Texto ----

    static String clean(String text) {
        return text == null ? "" : text.strip().replaceAll("\\s+", " ");
    }

    private static String endSentence(String text) {
        return text.endsWith(".") ? text : text + ".";
    }

    static String shorten(String text) {
        if (text.length() <= MAX_BODY) {
            return text;
        }
        int cut = text.lastIndexOf(' ', MAX_BODY - 1);
        return text.substring(0, cut > 100 ? cut : MAX_BODY - 1).replaceAll("[,.;:]$", "") + "…";
    }
}
