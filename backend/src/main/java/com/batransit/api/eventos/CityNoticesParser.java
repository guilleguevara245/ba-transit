package com.batransit.api.eventos;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee los listados de noticias de buenosaires.gob.ar (/noticias y
 * /noticias-relacionadas/Tránsito). Cada noticia es una tarjeta:
 *
 *   <div class="card"> ... <span class="badge ...">Cortes de tránsito</span> ...
 *     <a href="/noticias/corte-por-evento-..." class="card-title-link ...">Corte por evento ...</a>
 *     <p class="card-text">Conocé las afectaciones por ...</p>
 *     <span>Fecha de publicación: 20/10/2026</span>
 *
 * y se queda con las que anuncian cortes de calles (por el titulo y el
 * resumen: no todas tienen el rubro Tránsito; la visita del Papa vino con
 * el rubro "Visita de León XIV").
 */
public final class CityNoticesParser {

    /** Una noticia del listado. */
    public record Notice(String title, String summary, String url, LocalDate published, List<String> badges) {
    }

    private static final Pattern CARD = Pattern.compile("<div class=\"card\">");
    private static final Pattern BADGE = Pattern.compile("(?s)<span class=\"badge[^\"]*\">(.*?)</span>");
    private static final Pattern TITLE = Pattern.compile(
            "(?s)<a href=\"([^\"]+)\"[^>]*class=\"card-title-link[^\"]*\"[^>]*>(.*?)</a>");
    private static final Pattern SUMMARY = Pattern.compile("(?s)<p class=\"card-text\">(.*?)</p>");
    private static final Pattern DATE = Pattern.compile("Fecha de publicaci(?:ó|o|&oacute;)n:\\s*(\\d{1,2}/\\d{1,2}/\\d{4})");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d/M/yyyy");

    /**
     * Lo que anuncia un corte de calles (sobre el texto sin tildes y en
     * minusculas). "Corte" solo cuenta si no es de cinta, de luz, de agua
     * ni la Corte Suprema.
     */
    private static final List<Pattern> CLOSURE = List.of(
            Pattern.compile("\\bcort(e|es|ad[oa]s?)\\b(?! (de (cinta|luz|agua|energia|pelo|suministro)|suprema|interamericana))"),
            Pattern.compile("\\bdesvios?\\b"),
            Pattern.compile("\\bafectacion(es)? (de|al|en el) transito\\b|\\bafectaciones\\b"),
            Pattern.compile("\\bzonas? de seguridad\\b"),
            Pattern.compile("\\bcalles? cerrad"),
            Pattern.compile("\\bcerrad[oa]s? al transito\\b"),
            Pattern.compile("\\bcierres? (total |parcial )?de (la |las |el |los )?(calles?|avenidas?|av\\b|autopistas?|transito)"),
            Pattern.compile("\\brestriccion(es)? (de transito|vehicular(es)?|al transito)"),
            Pattern.compile("\\boperativo de transito\\b"));

    private CityNoticesParser() {
    }

    /** Las noticias de un listado; base: el sitio, para armar los enlaces completos. */
    public static List<Notice> parse(String html, String base) {
        List<Notice> notices = new ArrayList<>();
        if (html == null) {
            return notices;
        }
        String root = base.replaceAll("/+$", "");
        Matcher cards = CARD.matcher(html);
        List<Integer> starts = new ArrayList<>();
        while (cards.find()) {
            starts.add(cards.start());
        }
        for (int i = 0; i < starts.size(); i++) {
            String card = html.substring(starts.get(i), i + 1 < starts.size() ? starts.get(i + 1) : html.length());
            Matcher title = TITLE.matcher(card);
            Matcher date = DATE.matcher(card);
            if (!title.find() || !date.find()) {
                continue;
            }
            LocalDate published;
            try {
                published = LocalDate.parse(date.group(1), DAY);
            } catch (DateTimeParseException e) {
                continue;
            }
            String href = unescape(title.group(1)).strip();
            String url = href.startsWith("http") ? href : root + (href.startsWith("/") ? "" : "/") + href;
            Matcher summary = SUMMARY.matcher(card);
            List<String> badges = new ArrayList<>();
            Matcher badge = BADGE.matcher(card);
            while (badge.find()) {
                badges.add(text(badge.group(1)));
            }
            notices.add(new Notice(text(title.group(2)), summary.find() ? text(summary.group(1)) : null, url,
                    published, List.copyOf(badges)));
        }
        return notices;
    }

    /** Si la noticia anuncia cortes de calles. */
    public static boolean isClosure(Notice notice) {
        String text = normalize(notice.title() + " " + (notice.summary() == null ? "" : notice.summary()));
        return CLOSURE.stream().anyMatch(p -> p.matcher(text).find());
    }

    /** Texto de un pedazo de HTML: sin etiquetas, con las entidades resueltas y sin espacios de mas. */
    static String text(String html) {
        return unescape(html.replaceAll("(?s)<[^>]+>", " ")).replaceAll("[\\s\\u00a0]+", " ").strip();
    }

    static String unescape(String text) {
        Matcher numeric = Pattern.compile("&#(x?)([0-9a-fA-F]+);").matcher(text);
        StringBuilder out = new StringBuilder();
        while (numeric.find()) {
            int code = Integer.parseInt(numeric.group(2), numeric.group(1).isEmpty() ? 10 : 16);
            numeric.appendReplacement(out, Matcher.quoteReplacement(new String(Character.toChars(code))));
        }
        numeric.appendTail(out);
        return out.toString().replace("&nbsp;", " ").replace("&quot;", "\"").replace("&lt;", "<")
                .replace("&gt;", ">").replace("&aacute;", "á").replace("&eacute;", "é").replace("&iacute;", "í")
                .replace("&oacute;", "ó").replace("&uacute;", "ú").replace("&ntilde;", "ñ").replace("&amp;", "&");
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
}
