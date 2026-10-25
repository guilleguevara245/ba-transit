package com.batransit.api.colectivos;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
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
            return values.get(index).trim();
        }
    }

    static void forEachRow(InputStream input, Consumer<Row> consumer) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8));
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
