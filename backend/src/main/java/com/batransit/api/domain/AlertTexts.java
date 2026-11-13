package com.batransit.api.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Lo que dice el texto de una alerta, para cuando la fuente no lo
 * informa en el efecto: el feed del subte no distingue un horario
 * extendido de una demora.
 */
public final class AlertTexts {

    /**
     * Algo bueno o neutro: horario extendido o especial, servicio adicional o
     * reforzado. "Extendido" solo alcanza: el feed escribe "Mañana extendido
     * por la Noche de los Museos".
     */
    private static final Pattern INFORMATIVE = Pattern.compile(
            "\\bextendid[oa]s?\\b"
                    + "|\\bhorario (?:ampliado|especial)\\b"
                    + "|\\b(?:extiende|extienden|extendera|extenderan|amplia|amplian|ampliara|ampliaran)"
                    + " (?:su |el )?horario\\b"
                    + "|\\bextension (?:del |de )?horario\\b"
                    + "|\\bservicio (?:extendido|adicional|reforzado)\\b"
                    + "|\\b(?:trenes|servicios|formaciones) adicionales\\b"
                    + "|\\brefuerz(?:o|a|an) (?:de |del |el |su )?servicio\\b");

    /** Si ademas habla de un problema, no es solo un aviso ("Medrano cerrado por obras"). */
    private static final Pattern PROBLEM = Pattern.compile(
            "interrump|suspend|sin servicio|demora|cerrad|limitad|desvi|obra|no se detiene|no para\\b|no habra");

    private AlertTexts() {
    }

    /** Si el texto es un aviso que no es un problema ("14-11 horario extendido por la Noche de los Museos"). */
    public static boolean isInformative(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String t = normalize(text);
        return INFORMATIVE.matcher(t).find() && !PROBLEM.matcher(t).find();
    }

    /** En minusculas, sin acentos y con un solo espacio entre palabras. */
    public static String normalize(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ");
    }
}
