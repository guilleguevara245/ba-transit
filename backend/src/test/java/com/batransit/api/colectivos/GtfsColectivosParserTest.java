package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.colectivos.BusModels.Catalog;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

class GtfsColectivosParserTest {

    @TempDir
    Path tmp;

    /** Feed GTFS minimo: la linea 152 con dos sentidos y un viaje corto. */
    static Map<String, String> sampleFeed() {
        Map<String, String> files = new LinkedHashMap<>();
        files.put("agency.txt", "﻿agency_id,agency_name\n1,\"Transportes Santa Fe, S.A.\"\n");
        files.put("routes.txt", "route_id,agency_id,route_short_name,route_long_name,route_color\n"
                + "R152,1,152,152A Olivos - La Boca,0057A8\nR8,1,8,8 Aeroparque - Ezeiza,\n");
        files.put("trips.txt", "route_id,service_id,trip_id,trip_headsign,direction_id,shape_id\n"
                + "R152,S,T1,A La Boca,0,SH1\n"
                + "R152,S,T2,A La Boca (corto),0,SH2\n"
                + "R152,S,T3,A Olivos,1,SH3\n"
                + "R8,S,T4,,0,\n");
        files.put("stop_times.txt", "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n"
                + "T1,08:00:00,08:00:00,P1,1\nT1,08:10:00,08:10:00,P2,2\nT1,08:20:00,08:20:00,P3,3\n"
                + "T2,09:00:00,09:00:00,P1,1\nT2,09:05:00,09:05:00,P2,2\n"
                + "T3,10:00:00,10:00:00,P3,2\nT3,10:20:00,10:20:00,P1,1\n"
                + "T4,11:00:00,11:00:00,P2,1\nT4,11:30:00,11:30:00,P4,2\n");
        files.put("stops.txt", "stop_id,stop_name,stop_lat,stop_lon\n"
                + "P1,Olivos,-34.51,-58.49\nP2,Plaza Italia,-34.58,-58.42\nP3,La Boca,-34.63,-58.36\nP4,Ezeiza,-34.82,-58.53\n");
        files.put("shapes.txt", "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n"
                + "SH1,-34.51,-58.49,1\nSH1,-34.58,-58.42,2\nSH1,-34.63,-58.36,3\n"
                + "SH3,-34.63,-58.36,1\nSH3,-34.51,-58.49,2\n");
        return files;
    }

    static Path writeZip(Path dir, Map<String, String> files) throws IOException {
        Path zip = dir.resolve("feed.zip");
        try (OutputStream out = Files.newOutputStream(zip); ZipOutputStream zos = new ZipOutputStream(out)) {
            for (Map.Entry<String, String> file : files.entrySet()) {
                zos.putNextEntry(new ZipEntry(file.getKey()));
                zos.write(file.getValue().getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }
        return zip;
    }

    @Test
    void armaLineasConSentidosParadasYRecorrido() throws IOException {
        Catalog catalog = new GtfsColectivosParser().parse(writeZip(tmp, sampleFeed()));

        BusRoute route = catalog.routes().get("R152");
        assertThat(route.shortName()).isEqualTo("152");
        assertThat(route.agency()).isEqualTo("Transportes Santa Fe, S.A.");
        assertThat(route.color()).isEqualTo("#0057A8");
        assertThat(route.directions()).hasSize(2);

        // Entre T1 (3 paradas) y T2 (2 paradas) se elige el mas completo.
        var ida = route.directions().get(0);
        assertThat(ida.headsign()).isEqualTo("A La Boca");
        assertThat(ida.stops()).extracting(s -> s.name()).containsExactly("Olivos", "Plaza Italia", "La Boca");
        assertThat(ida.shape()).hasSize(3);

        // Las paradas se ordenan por stop_sequence aunque vengan desordenadas.
        assertThat(route.directions().get(1).stops()).extracting(s -> s.name()).containsExactly("Olivos", "La Boca");
    }

    @Test
    void sinShapeUsaLasParadasYSinDestinoUsaLaUltimaParada() throws IOException {
        Catalog catalog = new GtfsColectivosParser().parse(writeZip(tmp, sampleFeed()));

        BusRoute route = catalog.routes().get("R8");
        assertThat(route.color()).isNull();
        assertThat(route.directions()).hasSize(1);
        assertThat(route.directions().get(0).headsign()).isEqualTo("Ezeiza");
        assertThat(route.directions().get(0).shape()).hasSize(2);
    }

    @Test
    void simplificaRecorridosLargosConservandoExtremos() {
        List<double[]> points = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            points.add(new double[] {i, i});
        }

        List<double[]> simplified = GtfsColectivosParser.simplify(points);

        assertThat(simplified).hasSize(GtfsColectivosParser.MAX_SHAPE_POINTS);
        assertThat(simplified.get(0)[0]).isZero();
        assertThat(simplified.get(simplified.size() - 1)[0]).isEqualTo(999);
    }

    @Test
    void parseaCamposEntreComillas() {
        assertThat(GtfsCsv.parseLine("1,\"Santa Fe, S.A.\",\"dice \"\"hola\"\"\",")).containsExactly(
                "1", "Santa Fe, S.A.", "dice \"hola\"", "");
    }
}
