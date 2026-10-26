package com.batransit.api.eventos;

import com.fasterxml.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Convierte la respuesta de /transito/v1/eventos de la API Transporte
 * (lista "list" con code, type, subtypeNames, name, description,
 * startTimestamp, endTimestamp, closeTimestamp, impact, fromLat, fromLon,
 * networkPointFromRoadWayName, ...) en eventos para el sitio.
 *
 * El feed trae de todo (podas, bacheos, choques): se quedan solo los
 * eventos masivos y manifestaciones, y las obras o cortes de impacto
 * severo, que empiezan en los proximos dias o estan en curso.
 */
public final class TransitEventParser {

    /** Hasta cuantos dias adelante se muestran. */
    static final Duration WINDOW = Duration.ofDays(14);
    private static final int MAX_DESCRIPTION = 240;

    private TransitEventParser() {
    }

    public static List<CityEvent> parse(JsonNode body, Instant now) {
        List<CityEvent> result = new ArrayList<>();
        if (body == null) {
            return result;
        }
        JsonNode list = body.isArray() ? body : body.path("list");
        for (JsonNode item : list) {
            CityEvent event = toEvent(item, now);
            if (event != null) {
                result.add(event);
            }
        }
        return result;
    }

    static CityEvent toEvent(JsonNode item, Instant now) {
        Instant start = instant(item, "startTimestamp");
        Instant end = instant(item, "endTimestamp");
        Instant closed = instant(item, "closeTimestamp");
        if (closed != null && !closed.isAfter(now)) {
            return null; // ya lo cerraron
        }
        if (end != null && !end.isAfter(now)) {
            return null;
        }
        if (start != null && start.isAfter(now.plus(WINDOW))) {
            return null;
        }

        String type = text(item, "type");
        String name = text(item, "name");
        String description = text(item, "description");
        String subtypes = item.path("subtypeNames").isArray()
                ? joinArray(item.path("subtypeNames"))
                : text(item, "subtypeNames");
        boolean severe = normalize(text(item, "impact")).startsWith("sever");
        String kind = classify(normalize(type + " " + subtypes + " " + name + " " + description), severe);
        if (kind == null) {
            return null;
        }

        String street = text(item, "networkPointFromRoadWayName");
        String link = text(item, "networkPointFromLinkName");
        String streets = street.isEmpty() ? link : link.isEmpty() || link.equals(street) ? street : street + " · " + link;
        double lat = item.path("fromLat").asDouble(0);
        double lon = item.path("fromLon").asDouble(0);
        String title = !name.isEmpty() ? name : !type.isEmpty() ? type : "Corte de tránsito";

        return new CityEvent("api-" + text(item, "code"), "API", kind, title, shorten(cleanDescription(description)),
                streets.isEmpty() ? null : streets, start, end,
                lat == 0 ? null : lat, lon == 0 ? null : lon,
                severe ? "ALTO" : "BAJO", null, false);
    }

    /** EVENTO, MANIFESTACION, OBRA o CORTE; null si no interesa (podas, choques, bacheo...). */
    static String classify(String text, boolean severe) {
        if (text.matches(".*(evento|musical|recital|concierto|deport|maraton|carrera|desfile|festival|feria|show|partido).*")) {
            return "EVENTO";
        }
        if (text.matches(".*(manifestacion|marcha|protesta|movilizacion).*")) {
            return "MANIFESTACION";
        }
        if (!severe) {
            return null;
        }
        if (text.matches(".*(obra|construccion|paviment).*")) {
            return "OBRA";
        }
        if (text.contains("corte")) {
            return "CORTE";
        }
        return null;
    }

    /** El feed suele anteponer "Buenos Aires:." a la descripcion. */
    private static String cleanDescription(String text) {
        return text.replaceFirst("^(Prueba\\s+)?Buenos Aires:\\.\\s*", "").trim();
    }

    private static String shorten(String text) {
        if (text.isEmpty()) {
            return null;
        }
        return text.length() > MAX_DESCRIPTION ? text.substring(0, MAX_DESCRIPTION).trim() + "…" : text;
    }

    private static String joinArray(JsonNode array) {
        List<String> parts = new ArrayList<>();
        array.forEach(n -> parts.add(n.asText("")));
        return String.join(" ", parts);
    }

    private static Instant instant(JsonNode item, String field) {
        String value = text(item, field);
        if (value.isEmpty()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String text(JsonNode item, String field) {
        JsonNode node = item.path(field);
        return node.isMissingNode() || node.isNull() ? "" : node.asText("").trim();
    }

    static String normalize(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
}
