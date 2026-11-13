package com.batransit.api.trenes;

import com.batransit.api.domain.AlertType;
import com.fasterxml.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    /** Cuanto despues de su salida (y su demora) deja de mostrarse la alerta de un tren puntual. */
    static final Duration TRAIN_ALERT_WINDOW = Duration.ofMinutes(45);
    /** "el tren de 17:59 hs", "el tren de las 8.15" (sobre el texto sin tildes y en minusculas). */
    private static final Pattern TRAIN_TIME = Pattern.compile("\\btren(?:es)? de (?:las )?(\\d{1,2})[:.](\\d{2})\\b");
    /** "con 13 minutos aproximadamente de demora", "una demora de 20 minutos". */
    private static final Pattern DELAY = Pattern.compile(
            "(\\d{1,3}) minutos? (?:aproximadamente )?de (?:demora|atraso)|(?:demora|atraso) de (\\d{1,3}) minutos?");
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

    /**
     * Una alerta vigente de la linea. branchEnd: la estacion de SOFSE donde
     * termina el ramal de la alerta (para saber cual de nuestros ramales
     * es); null si la alerta figura en mas de un ramal (es de la linea).
     */
    public record SofseAlert(int id, AlertType type, String description, Integer cause, Integer effect,
                             Integer branchEnd) {
        SofseAlert withoutBranch() {
            return new SofseAlert(id, type, description, cause, effect, null);
        }
    }

    /**
     * Las alertas vigentes en now, de todos los ramales de una linea (una
     * alerta que figura en varios ramales cuenta una vez).
     */
    public static List<SofseAlert> parse(JsonNode branches, Instant now) {
        Map<Integer, SofseAlert> alerts = new LinkedHashMap<>();
        for (JsonNode branch : branches) {
            Integer end = number(branch.path("id_estacion_final"));
            if (end == null) {
                end = number(branch.path("cabecera_final").path("id"));
            }
            for (JsonNode alert : branch.path("alerta")) {
                Integer id = number(alert.path("id"));
                String text = SofseArrivals.text(alert.path("contenido"));
                if (id == null || text == null || !enabled(alert, now) || resolved(text)
                        || trainPassed(alert, text, now)) {
                    continue;
                }
                SofseAlert seen = alerts.get(id);
                if (seen != null) {
                    // La misma alerta en otro ramal: es de la linea.
                    if (!Objects.equals(seen.branchEnd(), end)) {
                        alerts.put(id, seen.withoutBranch());
                    }
                    continue;
                }
                String effect = alert.path("efecto_gtfs").asText("");
                String cause = alert.path("causa_gtfs").asText("");
                alerts.put(id, new SofseAlert(id, typeOf(effect, cause, text), text, CAUSES.get(cause),
                        EFFECTS.get(effect), end));
            }
        }
        return new ArrayList<>(alerts.values());
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
     * Las alertas de un tren puntual ("El tren de 17:59 hs de Jáuregui a
     * Moreno circula con 13 minutos aproximadamente de demora") suelen
     * quedar publicadas sin fecha de fin. Se dan por terminadas cuando ese
     * tren ya paso: TRAIN_ALERT_WINDOW despues de su salida mas la demora
     * que diga el texto.
     */
    static boolean trainPassed(JsonNode alert, String text, Instant now) {
        Matcher time = TRAIN_TIME.matcher(normalize(text));
        if (!time.find()) {
            return false;
        }
        int hour = Integer.parseInt(time.group(1));
        int minute = Integer.parseInt(time.group(2));
        if (hour > 23 || minute > 59) {
            return false;
        }
        Instant published = dateTime(alert.path("vigencia_desde"));
        ZonedDateTime base = (published == null ? now : published).atZone(ZONE);
        ZonedDateTime departure = base.toLocalDate().atTime(hour, minute).atZone(ZONE);
        // Publicada a la noche por un tren de la madrugada siguiente.
        if (departure.isBefore(base.minusHours(12))) {
            departure = departure.plusDays(1);
        }
        Matcher delay = DELAY.matcher(normalize(text));
        int delayMinutes = 0;
        if (delay.find()) {
            delayMinutes = Integer.parseInt(delay.group(1) != null ? delay.group(1) : delay.group(2));
        }
        return departure.toInstant().plus(Duration.ofMinutes(delayMinutes)).plus(TRAIN_ALERT_WINDOW).isBefore(now);
    }

    /**
     * Avisos de que el servicio volvio a la normalidad ("El servicio se
     * encuentra normalizado tras..."): duran unos minutos y no son una
     * alerta (la linea no tiene problemas). Se reconocen por el texto: el
     * verde con que la app los marca tambien lo usa para avisos que siguen
     * vigentes ("circulan con recorrido limitado ... por obras").
     */
    static boolean resolved(String text) {
        String t = normalize(text);
        return t.contains("normalizad") || t.contains("se normalizo") || t.contains("restablecid")
                || t.contains("regularizad") || RESUMED.matcher(t).find();
    }

    /**
     * "reanuda su recorrido", "se reanudo el servicio", "vuelven a circular",
     * "circula con normalidad". En presente o pasado: "se reanudara a las
     * 23" (futuro) es un aviso de que todavia no anda.
     */
    private static final Pattern RESUMED = Pattern.compile(
            "\\breanud(?:a|an|o|aron|ado|ada|ados|adas)\\b"
                    + "|\\b(?:vuelve|vuelven|volvio|volvieron) a (?:circular|prestar servicio|funcionar)\\b"
                    + "|\\bcircula(?:n)? con normalidad\\b");

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
