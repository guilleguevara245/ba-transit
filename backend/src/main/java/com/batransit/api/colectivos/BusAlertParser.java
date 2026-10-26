package com.batransit.api.colectivos;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee /colectivos/serviceAlerts?json=1 de la API Transporte. El formato
 * real no es el del subte: los campos llevan guion bajo (_entity, _alert,
 * _header_text) y las alertas no traen route_id, solo paradas. La linea
 * se toma del texto ("Recorrido en proceso de actualización Línea 148").
 */
public final class BusAlertParser {

    private BusAlertParser() {
    }

    /** lines: numeros de linea nombrados en el titulo o la descripcion. */
    public record BusAlert(List<String> lines, String title, String description, int effect, int stops) {
    }

    private static final Pattern LINE = Pattern.compile("(?i)l[ií]neas?\\s+((?:\\d{1,3}(?:\\s*(?:,|y|e)\\s*)?)+)");
    private static final Pattern NUMBER = Pattern.compile("\\d{1,3}");

    public static List<BusAlert> parse(JsonNode body, Instant now) {
        List<BusAlert> alerts = new ArrayList<>();
        if (body == null) {
            return alerts;
        }
        for (JsonNode entity : body.path("_entity")) {
            JsonNode alert = entity.path("_alert");
            if (alert.isMissingNode() || !isActive(alert.path("_active_period"), now)) {
                continue;
            }
            String title = text(alert.path("_header_text"));
            String description = text(alert.path("_description_text"));
            Set<String> lines = new LinkedHashSet<>();
            lines.addAll(linesIn(title));
            lines.addAll(linesIn(description));
            if (title.isBlank() && description.isBlank()) {
                continue;
            }
            alerts.add(new BusAlert(List.copyOf(lines), title.strip(), description.strip(),
                    alert.path("_effect").asInt(0), alert.path("_informed_entity").size()));
        }
        return alerts;
    }

    /** "Línea 148" -> [148]; "Líneas 12, 37 y 60" -> [12, 37, 60]. */
    static List<String> linesIn(String text) {
        List<String> lines = new ArrayList<>();
        Matcher matcher = LINE.matcher(text == null ? "" : text);
        while (matcher.find()) {
            Matcher number = NUMBER.matcher(matcher.group(1));
            while (number.find()) {
                lines.add(String.valueOf(Integer.parseInt(number.group())));
            }
        }
        return lines;
    }

    /** Sin periodos = vigente. Si tiene, alguno tiene que incluir ahora (segundos POSIX). */
    private static boolean isActive(JsonNode periods, Instant now) {
        if (!periods.isArray() || periods.isEmpty()) {
            return true;
        }
        long seconds = now.getEpochSecond();
        for (JsonNode p : periods) {
            long start = p.path("_start").asLong(0);
            long end = p.path("_end").asLong(0);
            if ((start == 0 || start <= seconds) && (end == 0 || seconds <= end)) {
                return true;
            }
        }
        return false;
    }

    private static String text(JsonNode translated) {
        JsonNode list = translated.path("_translation");
        if (list.isArray() && !list.isEmpty()) {
            return list.get(0).path("_text").asText("");
        }
        return "";
    }
}
