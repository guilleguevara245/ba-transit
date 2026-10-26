package com.batransit.api.trenes;

import com.batransit.api.domain.AlertType;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee la pagina "Modificaciones en el servicio y novedades" de Trenes
 * Argentinos (argentina.gob.ar). La pagina tiene un bloque desplegable
 * por linea ({@code <details><summary>Linea Roca</summary>...}) y, dentro,
 * un recuadro por aviso ({@code <div class="alert alert-danger">} con un
 * titulo h5 y un parrafo). El color del recuadro indica la gravedad.
 */
public final class TrainNoticesParser {

    /** Aviso de una linea de tren. */
    public record TrainNotice(String lineCode, String title, String text, AlertType type) {

        /** Texto para guardar como descripcion de la alerta: "Titulo: texto". */
        public String description() {
            return title.isEmpty() ? text : title + ": " + text;
        }
    }

    /** Resultado: avisos y cuantas secciones de lineas del AMBA se reconocieron. */
    public record Result(List<TrainNotice> notices, int sectionsFound) {
    }

    /** Titulo de la seccion (sin tildes, minusculas) -> codigo de la linea en nuestra base. */
    static final Map<String, String> LINES = Map.of(
            "linea roca", "ROCA",
            "linea mitre", "MITRE",
            "linea sarmiento", "SARMIENTO",
            "linea san martin", "SAN_MARTIN",
            "linea belgrano sur", "BELGRANO_SUR",
            "linea belgrano norte", "BELGRANO_NORTE",
            "linea urquiza", "URQUIZA",
            "tren de la costa", "TREN_DE_LA_COSTA");

    private static final Pattern SECTION = Pattern.compile(
            "<summary>(.*?)</summary>(.*?)</details>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    private static final Pattern BOX = Pattern.compile(
            "<div class=\"alert alert-(\\w+)\"[^>]*>(.*?)</div>\\s*</div>\\s*</div>", Pattern.DOTALL);
    private static final Pattern TITLE = Pattern.compile(
            "<(?:h5|p)[^>]*class=\"h5[^\"]*\"[^>]*>(.*?)</(?:h5|p)>", Pattern.DOTALL);
    private static final Pattern MEDIA_BODY = Pattern.compile("class=\"media-body\">(.*)", Pattern.DOTALL);

    private TrainNoticesParser() {
    }

    public static Result parse(String html) {
        List<TrainNotice> notices = new ArrayList<>();
        int sections = 0;
        if (html == null) {
            return new Result(notices, 0);
        }
        Matcher section = SECTION.matcher(html);
        while (section.find()) {
            String lineCode = LINES.get(normalize(cleanText(section.group(1))));
            if (lineCode == null) {
                continue; // larga distancia, regionales, internacional
            }
            sections++;
            Matcher box = BOX.matcher(section.group(2));
            while (box.find()) {
                String color = box.group(1);
                String inner = box.group(2);
                Matcher body = MEDIA_BODY.matcher(inner);
                String content = body.find() ? body.group(1) : inner;
                String title = "";
                Matcher titleMatcher = TITLE.matcher(content);
                if (titleMatcher.find()) {
                    title = cleanText(titleMatcher.group(1));
                    content = content.substring(0, titleMatcher.start()) + content.substring(titleMatcher.end());
                }
                String text = cleanText(content);
                AlertType type = typeOf(color, title + " " + text);
                if (type == null || text.isEmpty() || normalize(title).contains("turistico")) {
                    continue;
                }
                notices.add(new TrainNotice(lineCode, title, text, type));
            }
        }
        return new Result(notices, sections);
    }

    /**
     * Rojo (danger) = servicio interrumpido o estacion cerrada; amarillo y
     * celeste (warning, info) = obra, desvio o recorrido limitado; verde y
     * recuadros de venta de pasajes no se muestran.
     */
    static AlertType typeOf(String color, String text) {
        String t = normalize(text);
        return switch (color) {
            case "danger" -> AlertType.INTERRUPCION;
            case "warning", "info" -> t.contains("recorrido limitado") || t.contains("anden") ? AlertType.DESVIO
                    : t.contains("obra") || t.contains("renovacion") ? AlertType.OBRA
                    : AlertType.DEMORA;
            default -> null;
        };
    }

    /** Saca etiquetas HTML, decodifica las entidades comunes y junta espacios. */
    static String cleanText(String html) {
        String text = html.replaceAll("(?s)<[^>]+>", " ")
                .replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"")
                .replace("&#039;", "'").replace("&lt;", "<").replace("&gt;", ">");
        return text.replaceAll("\\s+", " ").replaceAll(" ([,.;:])", "$1").trim();
    }

    static String normalize(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }
}
