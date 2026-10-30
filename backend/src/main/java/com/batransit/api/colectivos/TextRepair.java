package com.batransit.api.colectivos;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Arregla textos que la fuente manda "doblemente codificados": UTF-8 leido
 * como Windows-1252 y vuelto a guardar ("MORÃ³N" en vez de "MORÓN"). Si el
 * texto no tiene esa pinta, o no se puede rearmar sin perder caracteres,
 * queda como vino.
 */
public final class TextRepair {

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");
    private static final Locale ES = Locale.forLanguageTag("es-AR");

    private TextRepair() {
    }

    public static String fix(String text) {
        if (text == null || (text.indexOf('Ã') < 0 && text.indexOf('Â') < 0)) {
            return text;
        }
        try {
            ByteBuffer bytes = WINDOWS_1252.newEncoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .encode(java.nio.CharBuffer.wrap(text));
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
