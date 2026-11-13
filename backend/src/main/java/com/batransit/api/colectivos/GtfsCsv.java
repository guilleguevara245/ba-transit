package com.batransit.api.colectivos;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Lector minimo de los archivos CSV de un feed GTFS (agency.txt,
 * routes.txt, etc.). Lee fila por fila, sin cargar el archivo entero en
 * memoria: stop_times.txt de los colectivos del AMBA pesa cientos de MB.
 * Soporta campos entre comillas con comas adentro y el BOM inicial.
 *
 * Cada renglon se lee como UTF-8; si no lo es (hay renglones en
 * Windows-1252, donde la "Ñ" es un solo byte y en UTF-8 quedaba "?"), ese
 * renglon se lee como Windows-1252.
 */
final class GtfsCsv {

    private GtfsCsv() {
    }

    /** Una fila con acceso a las columnas por nombre. */
    static final class Row {
        private final Map<String, Integer> header;
        private final List<String> values;

        Row(Map<String, Integer> header, List<String> values) {
            this.header = header;
            this.values = values;
        }

        String get(String column) {
            Integer index = header.get(column);
            if (index == null || index >= values.size()) {
                return "";
            }
            // Algunos textos del feed vienen doblemente codificados ("MORÃ³N"): se arreglan aca.
            return TextRepair.fix(values.get(index).trim());
        }
    }

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");

    /** Lee renglones de bytes y los pasa a texto (UTF-8, o Windows-1252 si no es UTF-8). */
    static final class LineReader {
        private final InputStream input;
        private final CharsetDecoder utf8 = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        private byte[] buffer = new byte[512];

        LineReader(InputStream input) {
            this.input = new BufferedInputStream(input, 1 << 16);
        }

        /** El proximo renglon sin el salto ("\n" o "\r\n"), o null al final. */
        String readLine() throws IOException {
            int length = 0;
            int b;
            while ((b = input.read()) != -1 && b != '\n') {
                if (length == buffer.length) {
                    buffer = Arrays.copyOf(buffer, buffer.length * 2);
                }
                buffer[length++] = (byte) b;
            }
            if (b == -1 && length == 0) {
                return null;
            }
            if (length > 0 && buffer[length - 1] == '\r') {
                length--;
            }
            return decode(buffer, length);
        }

        String decode(byte[] bytes, int length) {
            try {
                return utf8.reset().decode(ByteBuffer.wrap(bytes, 0, length)).toString();
            } catch (CharacterCodingException e) {
                return new String(bytes, 0, length, WINDOWS_1252);
            }
        }
    }

    static void forEachRow(InputStream input, Consumer<Row> consumer) throws IOException {
        LineReader reader = new LineReader(input);
        String headerLine = reader.readLine();
        if (headerLine == null) {
            return;
        }
        if (!headerLine.isEmpty() && headerLine.charAt(0) == '﻿') {
            headerLine = headerLine.substring(1);
        }

        Map<String, Integer> header = new HashMap<>();
        List<String> columns = parseLine(headerLine);
        for (int i = 0; i < columns.size(); i++) {
            header.put(columns.get(i).trim(), i);
        }

        String line;
        while ((line = reader.readLine()) != null) {
            if (!line.isBlank()) {
                consumer.accept(new Row(header, parseLine(line)));
            }
        }
    }

    static List<String> parseLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    current.append(c);
                }
            } else if (c == '"') {
                quoted = true;
            } else if (c == ',') {
                values.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        values.add(current.toString());
        return values;
    }
}
