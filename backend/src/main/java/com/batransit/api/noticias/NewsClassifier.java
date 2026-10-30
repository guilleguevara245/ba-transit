package com.batransit.api.noticias;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Decide si una nota es del transporte del AMBA y de que tipo: subte,
 * trenes, colectivos o general. Mira solo el titular (sin acentos y en
 * minusculas). Las de otras ciudades (el subte de Santiago, el tren de
 * Cordoba) se descartan si no nombran nada de Buenos Aires.
 */
public final class NewsClassifier {

    private NewsClassifier() {
    }

    public enum Category { SUBTE, TRENES, COLECTIVOS, GENERAL }

    private static final Pattern SUBTE = Pattern.compile(
            "\\b(subtes?|subterraneos?|premetro|emova|linea [a-eh]\\b|subte [a-eh]\\b)");
    private static final Pattern TRENES = Pattern.compile(
            "\\b(trenes?|ferrocarril(es)?|mitre|sarmiento|roca|san martin|belgrano (norte|sur)|urquiza|tren de la costa"
                    + "|trenes argentinos|ferrovias|estacion (constitucion|retiro|once|federico lacroze))\\b");
    private static final Pattern COLECTIVOS = Pattern.compile("\\b(colectivos?|bondis?|lineas? de colectivo|boleto de colectivo)\\b");
    /** Nombra a Buenos Aires: si no, las de transporte de otros lugares se descartan. */
    private static final Pattern AMBA = Pattern.compile(
            "\\b(amba|caba|linea [a-eh]\\b|ciudad de buenos aires|buenos aires|porten[oa]s?|conurbano|gran buenos aires|sube|emova"
                    + "|premetro|subtes?|mitre|sarmiento|roca|urquiza|tren de la costa|belgrano (norte|sur)"
                    + "|retiro|constitucion|once|la plata|quilmes|tigre|moreno|merlo|lanus|avellaneda|moron|pilar)\\b");
    /** Transporte en general (paro, tarifa, boleto) para la categoria General. */
    private static final Pattern GENERAL = Pattern.compile(
            "\\b(transporte|tarifas?|boletos?|paro|huelga|autopistas?|peajes?|ecobici|movilidad|transito|cortes?)\\b");
    /**
     * Otros lugares (no van calles de la Ciudad que se llaman igual, como
     * Av. Cordoba o Lima).
     */
    private static final List<String> FOREIGN = List.of("santiago de chile", "madrid", "barcelona", "nueva york",
            "sao paulo", "ciudad de mexico", "metro de", "ciudad de cordoba", "provincia de cordoba", "tren de las sierras",
            "rosario:", "cordoba:", "mendoza:", "chile:", "uruguay:", "brasil:", "espana:");

    static String normalize(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    /** null si la nota no es del transporte del AMBA. */
    public static Category classify(String title) {
        String t = normalize(title);
        boolean amba = AMBA.matcher(t).find();
        if (!amba || FOREIGN.stream().anyMatch(t::contains) && !t.contains("buenos aires")) {
            return null;
        }
        if (SUBTE.matcher(t).find()) {
            return Category.SUBTE;
        }
        if (TRENES.matcher(t).find()) {
            return Category.TRENES;
        }
        if (COLECTIVOS.matcher(t).find()) {
            return Category.COLECTIVOS;
        }
        return GENERAL.matcher(t).find() ? Category.GENERAL : null;
    }
}
