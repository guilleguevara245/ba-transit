package com.batransit.api.trenes;

import com.batransit.api.domain.AlertType;
import com.fasterxml.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Alertas de la app de Trenes Argentinos: vienen dentro de cada ramal en
 * /infraestructura/ramales ("alerta"), con su texto, el efecto y la causa
 * en terminos de GTFS-Realtime y desde/hasta cuando valen:
 *
 *   {"id": 9, "nombre": "Retiro-J.L. Suárez", "alerta": [{"id": 99609,
 *     "efecto_gtfs": "NO_SERVICE", "causa_gtfs": "OTHER_CAUSE", "habilitado": 1,
 *     "contenido": "El servicio J.L. Suárez se encuentra interrumpido...",
 *     "vigencia_desde": "2026-11-11 13:27:00", "vigencia_hasta": null}]}
 *
 * Son la unica fuente automatica de alertas de los trenes (las de la app
 * oficial: interrupciones, demoras, cambios de anden, obras).
 */
public final class SofseAlerts {

    static final String ID_PREFIX = "sofse:";
    /** El fondo verde con que la app marca los avisos de servicio normalizado. */
    static final String RESOLVED_BACKGROUND = "#dff0d8";
    /** Las fechas de vigencia vienen en hora de Buenos Aires, sin zona. */
    static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm[:ss]");

    /** Los valores de "effect" y "cause" de GTFS-Realtime, para guardarlos como en el subte. */
    static final Map<String, Integer> EFFECTS = Map.ofEntries(
            Map.entry("NO_SERVICE", 1), Map.entry("REDUCED_SERVICE", 2), Map.entry("SIGNIFICANT_DELAYS", 3),
            Map.entry("DETOUR", 4), Map.entry("ADDITIONAL_SERVICE", 5), Map.entry("MODIFIED_SERVICE", 6),
            Map.entry("OTHER_EFFECT", 7), Map.entry("UNKNOWN_EFFECT", 8), Map.entry("STOP_MOVED", 9),
            Map.entry("NO_EFFECT", 10), Map.entry("ACCESSIBILITY_ISSUE", 11));
    static final Map<String, Integer> CAUSES = Map.ofEntries(
            Map.entry("UNKNOWN_CAUSE", 1), Map.entry("OTHER_CAUSE", 2), Map.entry("TECHNICAL_PROBLEM", 3),
            Map.entry("STRIKE", 4), Map.entry("DEMONSTRATION", 5), Map.entry("ACCIDENT", 6),
            Map.entry("HOLIDAY", 7), Map.entry("WEATHER", 8), Map.entry("MAINTENANCE", 9),
            Map.entry("CONSTRUCTION", 10), Map.entry("POLICE_ACTIVITY", 11), Map.entry("MEDICAL_EMERGENCY", 12));

    private SofseAlerts() {
    }

    /** Una alerta vigente de la linea. */
    public record SofseAlert(int id, AlertType type, String description, Integer cause, Integer effect) {
    }

    /**
     * Las alertas vigentes en now, de todos los ramales de una linea (una
     * alerta que figura en varios ramales cuenta una vez).
     */
    public static List<SofseAlert> parse(JsonNode branches, Instant now) {
        Set<Integer> seen = new LinkedHashSet<>();
        List<SofseAlert> alerts = new ArrayList<>();
        for (JsonNode branch : branches) {
            for (JsonNode alert : branch.path("alerta")) {
                Integer id = number(alert.path("id"));
                String text = SofseArrivals.text(alert.path("contenido"));
                if (id == null || text == null || !enabled(alert, now) || resolved(alert, text) || !seen.add(id)) {
                    continue;
                }
                String effect = alert.path("efecto_gtfs").asText("");
                String cause = alert.path("causa_gtfs").asText("");
                alerts.add(new SofseAlert(id, typeOf(effect, cause, text), text, CAUSES.get(cause),
                        EFFECTS.get(effect)));
            }
        }
        return alerts;
    }

    /** Habilitada y dentro de su vigencia (sin fechas, vale siempre). */
    static boolean enabled(JsonNode alert, Instant now) {
        JsonNode on = alert.path("habilitado");
        if ((on.isBoolean() && !on.asBoolean()) || ((on.isNumber() || on.isTextual()) && "0".equals(on.asText().strip()))) {
            return false;
        }
        Instant from = dateTime(alert.path("vigencia_desde"));
        Instant to = dateTime(alert.path("vigencia_hasta"));
        return (from == null || !from.isAfter(now)) && (to == null || to.isAfter(now));
    }

    /**
     * Avisos de que el servicio volvio a la normalidad ("El servicio se
     * encuentra normalizado tras..."): la app los muestra en verde y duran
     * unos minutos. No son una alerta (la linea no tiene problemas).
     */
    static boolean resolved(JsonNode alert, String text) {
        if (RESOLVED_BACKGROUND.equalsIgnoreCase(alert.path("criticidad_color_fondo").asText("").strip())) {
            return true;
        }
        String t = normalize(text);
        return t.contains("normalizad") || t.contains("se normalizo") || t.contains("restablecid")
                || t.contains("regularizad");
    }

    /**
     * Nuestro tipo de alerta: por el efecto que informa la fuente y, si es
     * generico, por el texto (como con los avisos de la pagina).
     */
    static AlertType typeOf(String effect, String cause, String text) {
        switch (effect) {
            case "NO_SERVICE":
                return AlertType.INTERRUPCION;
            case "REDUCED_SERVICE", "SIGNIFICANT_DELAYS":
                return AlertType.DEMORA;
            case "DETOUR", "STOP_MOVED", "MODIFIED_SERVICE":
                return AlertType.DESVIO;
            default:
                break;
        }
        String t = normalize(text);
        if (t.contains("interrump") || t.contains("suspend") || t.contains("sin servicio")) {
            return AlertType.INTERRUPCION;
        }
        if (t.contains("demora") || t.contains("frecuencia")) {
            return AlertType.DEMORA;
        }
        if ("MAINTENANCE".equals(cause) || "CONSTRUCTION".equals(cause) || t.contains("obra")) {
            return AlertType.OBRA;
        }
        return AlertType.DESVIO;
    }

    /** Id con que se guarda una alerta: "sofse:MITRE:99609". */
    static String externalId(String lineCode, int alertId) {
        return ID_PREFIX + lineCode + ":" + alertId;
    }

    /** La linea de un id guardado ("sofse:MITRE:99609" -> "MITRE"); "" si no es de esta fuente. */
    static String lineOf(String externalId) {
        if (externalId == null || !externalId.startsWith(ID_PREFIX)) {
            return "";
        }
        int end = externalId.indexOf(':', ID_PREFIX.length());
        return end < 0 ? "" : externalId.substring(ID_PREFIX.length(), end);
    }

    private static Instant dateTime(JsonNode node) {
        if (!node.isTextual() || node.asText().isBlank()) {
            return null;
        }
        String value = node.asText().strip().replace('T', ' ');
        try {
            return LocalDateTime.parse(value.length() > 19 ? value.substring(0, 19) : value, DATE_TIME)
                    .atZone(ZONE).toInstant();
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static Integer number(JsonNode node) {
        if (node.isInt() || node.isLong()) {
            return node.asInt();
        }
        try {
            return node.isTextual() ? Integer.valueOf(node.asText().strip()) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
}
