package com.batransit.api.trenes;

import com.batransit.api.domain.AlertType;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee el HTML del mensaje "estadoLineas" de Metrovias:
 *
 *   <span class='col-12 linea'>Línea Urquiza</span> ...
 *   <div class='col-12 estado' style='color: black'>• Normal</div>
 *
 * Devuelve la linea y el estado; si el estado es "Normal" no hay aviso.
 */
public final class MetroviasStatusParser {

    private static final Pattern LINE = Pattern.compile(
            "class=['\"][^'\"]*\\blinea\\b[^'\"]*['\"][^>]*>(.*?)</", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern STATUS = Pattern.compile(
            "class=['\"][^'\"]*\\bestado\\b[^'\"]*['\"][^>]*>(.*?)</div>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private MetroviasStatusParser() {
    }

    /** lineCode: codigo de la linea en la base (URQUIZA); status: texto del estado, sin la viñeta. */
    public record LineStatus(String lineCode, String status) {

        public boolean normal() {
            return normalize(status).equals("normal");
        }

        /** Texto del aviso: el estado tal cual, o "Servicio ..." si es una sola palabra. */
        public String description() {
            String text = status.trim();
            if (!text.contains(" ")) {
                return "Servicio " + text.toLowerCase(Locale.forLanguageTag("es"));
            }
            return Character.toUpperCase(text.charAt(0)) + text.substring(1);
        }

        public AlertType type() {
            String t = normalize(status);
            if (t.contains("interrump") || t.contains("suspend") || t.contains("sin servicio")) {
                return AlertType.INTERRUPCION;
            }
            if (t.contains("limitad") || t.contains("parcial") || t.contains("desvi")) {
                return AlertType.DESVIO;
            }
            if (t.contains("obra")) {
                return AlertType.OBRA;
            }
            return AlertType.DEMORA;
        }
    }

    public static Optional<LineStatus> parse(String html) {
        if (html == null || html.isBlank()) {
            return Optional.empty();
        }
        Matcher line = LINE.matcher(html);
        Matcher status = STATUS.matcher(html);
        if (!line.find() || !status.find()) {
            return Optional.empty();
        }
        String lineCode = lineCode(text(line.group(1)));
        String state = text(status.group(1)).replaceFirst("^[•·\\-*]\\s*", "").trim();
        if (lineCode == null || state.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new LineStatus(lineCode, state));
    }

    /** "Línea Urquiza" -> URQUIZA. Metrovias hoy solo opera el Urquiza. */
    static String lineCode(String name) {
        return normalize(name).contains("urquiza") ? "URQUIZA" : null;
    }

    private static String text(String html) {
        return html.replaceAll("(?s)<[^>]+>", " ").replace("&nbsp;", " ").replace("&amp;", "&")
                .replace("&#8226;", "•").replace("&bull;", "•").replaceAll("\\s+", " ").trim();
    }

    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
