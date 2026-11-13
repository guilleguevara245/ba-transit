package com.batransit.api.colectivos;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetEncoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Arregla textos que la fuente manda "doblemente codificados": UTF-8 leido
 * como Windows-1252 (o ISO-8859-1) y vuelto a guardar ("MORÃ³N" en vez de
 * "MORÓN"). Las mayusculas acentuadas y la "Ñ" quedan con un caracter de
 * control si se leyeron como ISO-8859-1 ("CAÃ" + U+0091): tambien se
 * arreglan. Si el texto no tiene esa pinta, o no se puede rearmar sin
 * perder caracteres, queda como vino.
 */
public final class TextRepair {

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");
    private static final Locale ES = Locale.forLanguageTag("es-AR");

    private TextRepair() {
    }

    /** Una letra perdida: el caracter de reemplazo o un "?" entre letras ("MU?ECAS"). */
    private static final java.util.regex.Pattern LOST_LETTER =
            java.util.regex.Pattern.compile("\uFFFD|\\p{L}\\?\\p{L}|\\d\\?(?!\\p{L})");
    private static final String VOWELS = "AEIOUaeiouÁÉÍÓÚáéíóú";

    /** Si el texto perdio alguna letra (el feed trae "?" en su lugar: "MU?ECAS", "HUMBERTO 1?"). */
    public static boolean lostLetters(String text) {
        return text != null && LOST_LETTER.matcher(text).find();
    }

    public static String fix(String text) {
        return guessLostLetters(fixDoubleEncoding(text));
    }

    /**
     * El feed trae algunas letras como "?" (se perdieron antes de publicarlo,
     * no se pueden recuperar de los bytes). Se adivinan con reglas que
     * cubren todos los casos del feed: entre dos vocales es una Ñ (PE?A,
     * MU?ECAS, CASTA?EDA, NU?EZ); al final, despues de "LL" o "I", "?N" es
     * "ÓN" (PABELL?N, ESTACI?N); un numero con "?" es un ordinal
     * (HUMBERTO 1?). Lo que no entra en ninguna regla queda como estaba.
     */
    static String guessLostLetters(String text) {
        if (text == null || text.indexOf('?') < 0) {
            return text;
        }
        StringBuilder out = new StringBuilder(text);
        for (int i = 0; i < out.length(); i++) {
            if (out.charAt(i) != '?') {
                continue;
            }
            char before = i > 0 ? out.charAt(i - 1) : ' ';
            char after = i + 1 < out.length() ? out.charAt(i + 1) : ' ';
            boolean wordEndsAfter = i + 2 >= out.length() || !Character.isLetter(out.charAt(i + 2));
            boolean lower = Character.isLowerCase(before) || Character.isLowerCase(after);
            if (VOWELS.indexOf(before) >= 0 && VOWELS.indexOf(after) >= 0) {
                out.setCharAt(i, lower ? 'ñ' : 'Ñ');
            } else if ((after == 'N' || after == 'n') && wordEndsAfter
                    && (before == 'I' || before == 'i' || (i >= 2 && "Ll".indexOf(before) >= 0
                    && "Ll".indexOf(out.charAt(i - 2)) >= 0))) {
                out.setCharAt(i, lower ? 'ó' : 'Ó');
            } else if (Character.isDigit(before) && !Character.isLetter(after)) {
                out.setCharAt(i, 'º');
            }
        }
        return out.toString();
    }

    /** Textos doblemente codificados ("MORÃ³N"): se vuelven a leer como UTF-8. */
    static String fixDoubleEncoding(String text) {
        if (text == null || (text.indexOf('Ã') < 0 && text.indexOf('Â') < 0)) {
            return text;
        }
        try {
            ByteBuffer bytes = originalBytes(text);
            String repaired = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(bytes).toString();
            return upperIfShouting(repaired);
        } catch (CharacterCodingException e) {
            return text;
        }
    }

    /**
     * Los bytes que tenia el texto antes de leerse mal: hasta U+00FF, el
     * mismo valor (ISO-8859-1, que incluye los caracteres de control); lo
     * demas ("‘", "’"...), como en Windows-1252.
     */
    static ByteBuffer originalBytes(String text) throws CharacterCodingException {
        CharsetEncoder windows = WINDOWS_1252.newEncoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        ByteBuffer out = ByteBuffer.allocate(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c <= 0xFF) {
                out.put((byte) c);
            } else {
                ByteBuffer one = windows.reset().encode(CharBuffer.wrap(String.valueOf(c)));
                out.put(one.get(0));
            }
        }
        out.flip();
        return out;
    }

    /**
     * "EST. MORóN" -> "EST. MORÓN": si todas las demas letras son mayusculas,
     * las acentuadas tambien (la fuente las pasa a mayuscula sin acento).
     */
    static String upperIfShouting(String text) {
        boolean anyUpper = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (Character.isLetter(c) && Character.isLowerCase(c) && "áéíóúüñ".indexOf(c) < 0) {
                return text;
            }
            anyUpper |= Character.isUpperCase(c);
        }
        return anyUpper ? text.toUpperCase(ES) : text;
    }
}
