package com.batransit.api.colectivos;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Lectura de los CSV del feed: comillas, BOM y renglones que no vienen en UTF-8. */
class GtfsCsvTest {

    private static List<String> names(byte[] file) throws IOException {
        List<String> names = new ArrayList<>();
        GtfsCsv.forEachRow(new ByteArrayInputStream(file), row -> names.add(row.get("stop_name")));
        return names;
    }

    @Test
    void laEnieEnWindows1252SeLeeBien() throws IOException {
        ByteArrayOutputStream file = new ByteArrayOutputStream();
        file.writeBytes("stop_id,stop_name\r\n".getBytes(StandardCharsets.UTF_8));
        // Un renglon en UTF-8 y otro en Windows-1252 (la Ñ es el byte 0xD1).
        file.writeBytes("1,AV. RIVADAVIA Y PEÑA\r\n".getBytes(StandardCharsets.UTF_8));
        file.writeBytes("2,MUÑIZ Y CAÑUELAS\r\n".getBytes(Charset.forName("windows-1252")));
        file.writeBytes("3,\"Acoyte, esq. Rivadavia\"".getBytes(StandardCharsets.UTF_8));

        assertThat(names(file.toByteArray()))
                .containsExactly("AV. RIVADAVIA Y PEÑA", "MUÑIZ Y CAÑUELAS", "Acoyte, esq. Rivadavia");
    }

    @Test
    void saltaElBomYLosRenglonesVacios() throws IOException {
        byte[] file = "﻿stop_id,stop_name\n\n1,Once\n".getBytes(StandardCharsets.UTF_8);
        assertThat(names(file)).containsExactly("Once");
    }
}
