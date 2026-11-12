package com.batransit.api.trenes;

import com.batransit.api.trenes.FerroviasArrivals.Arrival;
import com.batransit.api.trenes.FerroviasArrivals.Direction;
import com.batransit.api.trenes.SofseArrivals.Parsed;
import com.batransit.api.trenes.SofseArrivals.Station;
import com.batransit.api.trenes.SofseArrivals.Trip;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SofseArrivalsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    /** El "timestamp" de la respuesta de ejemplo (Miguelete, 12/11/2026 14:44). */
    private static final Instant ASKED = Instant.ofEpochSecond(1794505448L);

    private static JsonNode resource(String name) throws IOException {
        try (InputStream in = SofseArrivalsTest.class.getResourceAsStream("/trenes/" + name)) {
            return MAPPER.readTree(in);
        }
    }

    /** Un arribo armado a mano, con lo que mira el parser. */
    private static String result(int sentido, int seconds, boolean scheduled, String to, int toId, String extra) {
        return """
                {"arribo": {"idElemento": 271, "parada": true, "programada": %s, "segundos": %d},
                 "servicio": {"sentido": %d, "cancelacion": null, "oculto": false,
                              "hasta": {"estacion": {"idElemento": %d, "nombre": "%s"}}%s}}
                """.formatted(scheduled, seconds, sentido, toId, to, extra);
    }

    private static JsonNode response(String... results) throws IOException {
        return MAPPER.readTree("{\"timestamp\": " + ASKED.getEpochSecond() + ", \"results\": ["
                + String.join(",", results) + "]}");
    }

    @Test
    void leeLaRespuestaRealDeMiguelete() throws IOException {
        Parsed parsed = SofseArrivals.parse(resource("sofse-arribos-271.json"), ASKED);

        assertThat(parsed.directions()).hasSize(1);
        Direction toRetiro = parsed.directions().get(0);
        assertThat(toRetiro.directionId()).isEqualTo(2);
        assertThat(toRetiro.towards()).isEqualTo("Retiro");
        assertThat(toRetiro.arrivals()).hasSize(1);
        // 4042 s: 67 minutos, con el horario programado.
        assertThat(toRetiro.arrivals().get(0).minutes()).isEqualTo(67);
        assertThat(toRetiro.arrivals().get(0).estimated()).isTrue();
        assertThat(parsed.scheduledOnly()).isTrue();
    }

    @Test
    void descuentaElTiempoQuePasoDesdeLaRespuesta() throws IOException {
        Parsed parsed = SofseArrivals.parse(resource("sofse-arribos-271.json"), ASKED.plusSeconds(120));
        assertThat(parsed.directions().get(0).arrivals().get(0).minutes()).isEqualTo(65);
    }

    @Test
    void agrupaPorSentidoConLaCabeceraInicialPrimeroYHastaTresPorSentido() throws IOException {
        Parsed parsed = SofseArrivals.parse(response(
                result(1, 900, false, "Tigre (C)", 500, ""),
                result(2, 300, false, "Retiro (LGM)", 332, ""),
                result(1, 120, false, "Tigre (C)", 500, ""),
                result(1, 1500, false, "Victoria", 420, ""),
                result(1, 2100, false, "Tigre (C)", 500, ""),
                result(2, 1200, true, "Retiro (LGM)", 332, "")), ASKED);

        assertThat(parsed.directions()).extracting(Direction::directionId).containsExactly(2, 1);
        Direction out = parsed.directions().get(1);
        assertThat(out.towards()).isEqualTo("Tigre (C)");
        assertThat(out.arrivals()).extracting(a -> a.minutes()).containsExactly(2, 15, 25);
        assertThat(out.arrivals().get(2).destination()).isEqualTo("Victoria");
        assertThat(parsed.scheduledOnly()).isFalse();
        // El numero de estacion de cada destino, para buscarle nuestro nombre.
        assertThat(parsed.destinationIds()).containsExactly(
                Map.entry("Tigre (C)", 500), Map.entry("Retiro", 332), Map.entry("Victoria", 420));
    }

    @Test
    void cambiaLosDestinosPorLosNombresDelSitio() throws IOException {
        Parsed parsed = SofseArrivals.parse(response(
                result(2, 300, true, "Plaza C.", 1, ""),
                result(2, 900, true, "Plaza C.", 1, ""),
                result(1, 120, true, "Bosques", 2, ""),
                result(1, 600, true, "La Plata", 3, "")), ASKED);

        Parsed renamed = SofseArrivals.renamed(parsed, Map.of("Plaza C.", "Plaza Constitución"));

        assertThat(renamed.directions().get(0).towards()).isEqualTo("Plaza Constitución");
        assertThat(renamed.directions().get(0).arrivals()).extracting(a -> a.destination())
                .containsOnly("Plaza Constitución");
        // Los que no tienen nombre nuestro quedan como vienen.
        assertThat(renamed.directions().get(1).towards()).isEqualTo("Bosques");
        assertThat(renamed.directions().get(1).arrivals()).extracting(a -> a.destination())
                .containsExactly("Bosques", "La Plata");
        assertThat(renamed.scheduledOnly()).isTrue();
        assertThat(SofseArrivals.renamed(parsed, Map.of())).isSameAs(parsed);
    }

    @Test
    void dejaAfueraOcultosLosQueNoParanLosQueTerminanAcaYLosQueYaPasaronYMarcaLosCancelados() throws IOException {
        Parsed parsed = SofseArrivals.parse(response(
                result(1, 600, false, "Tigre", 500, ", \"cancelacion\": {\"motivo\": \"Obras\"}"),
                result(1, 700, false, "Tigre", 500, ", \"oculto\": true"),
                result(1, 800, false, "Retiro", 271, ""),
                result(1, -300, false, "Tigre", 500, ""),
                """
                {"arribo": {"idElemento": 271, "parada": false, "programada": false, "segundos": 900},
                 "servicio": {"sentido": 1, "hasta": {"estacion": {"idElemento": 500, "nombre": "Tigre"}}}}
                """,
                result(1, 1000, false, "Tigre", 500, "")), ASKED);

        assertThat(parsed.directions()).hasSize(1);
        // El cancelado se muestra (tachado), pero no cuenta para los tres ni para el destino.
        assertThat(parsed.directions().get(0).arrivals()).extracting(a -> a.minutes()).containsExactly(10, 16);
        assertThat(parsed.directions().get(0).arrivals()).extracting(a -> a.cancelled()).containsExactly(true, false);
    }

    @Test
    void cuentaTresQueCorrenAunqueHayaCanceladosEntreMedio() throws IOException {
        String cancelled = ", \"cancelacion\": {\"motivo\": \"Falta de personal\"}";
        Parsed parsed = SofseArrivals.parse(response(
                result(1, 60, false, "Tigre", 500, ""),
                result(1, 300, false, "Tigre", 500, cancelled),
                result(1, 600, false, "Tigre", 500, ""),
                result(1, 900, false, "Tigre", 500, ""),
                result(1, 1200, false, "Tigre", 500, "")), ASKED);

        assertThat(parsed.directions().get(0).arrivals()).extracting(a -> a.minutes()).containsExactly(1, 5, 10, 15);
        // Un sentido con solo cancelados no se muestra.
        Parsed none = SofseArrivals.parse(response(result(1, 300, false, "Tigre", 500, cancelled)), ASKED);
        assertThat(none.directions()).isEmpty();
    }

    @Test
    void traeElAndenElTipoDeServicioYLaLeyenda() throws IOException {
        Parsed parsed = SofseArrivals.parse(response(
                result(1, 300, false, "Tigre", 500, """
                        , "tipo": {"nombre": "Rápido", "clasificacion": {"nombre": "Pasajeros"}},
                          "leyenda": "No se detiene en Belgrano C",
                          "estaciones": [{"idElemento": 271, "parada": true, "segundos": 300, "anden": {"nombre": "3"}}]
                        """),
                result(1, 600, false, "Tigre", 500, ", \"tipo\": {\"nombre\": \"Normal\"}"),
                result(1, 700, false, "Tigre", 500,
                        ", \"tipo\": {\"nombre\": \"Normal\", \"clasificacion\": {\"nombre\": \"Vacío\"}}")),
                ASKED);

        List<Arrival> arrivals = parsed.directions().get(0).arrivals();
        assertThat(arrivals).hasSize(2);
        assertThat(arrivals.get(0).platform()).isEqualTo("3");
        assertThat(arrivals.get(0).service()).isEqualTo("Rápido");
        assertThat(arrivals.get(0).note()).isEqualTo("No se detiene en Belgrano C");
        // El comun no lleva tipo; uno sin pasajeros no se muestra.
        assertThat(arrivals.get(1).service()).isNull();
        assertThat(arrivals.get(1).platform()).isNull();
    }

    @Test
    void armaElViajeHastaOtraEstacionConLaHoraDeLlegada() throws IOException {
        Parsed parsed = SofseArrivals.parse(resource("sofse-arribos-271.json"), ASKED);

        // De Miguelete a Retiro: sale 18:51:30 y llega 19:24 (UTC).
        List<Trip> trips = SofseArrivals.trips(parsed, 332, ASKED);
        assertThat(trips).hasSize(1);
        assertThat(trips.get(0).departure()).isEqualTo(Instant.parse("2026-11-12T18:51:30Z"));
        assertThat(trips.get(0).arrival()).isEqualTo(Instant.parse("2026-11-12T19:24:00Z"));
        assertThat(trips.get(0).scheduled()).isTrue();
        assertThat(trips.get(0).destination()).isEqualTo("Retiro");
        // Belgrano R esta despues y el tren para: si.
        assertThat(SofseArrivals.trips(parsed, 35, ASKED)).hasSize(1);
        // L. M. Drago (no para), Chilavert (quedo atras) y una de otra linea: no.
        assertThat(SofseArrivals.trips(parsed, 236, ASKED)).isEmpty();
        assertThat(SofseArrivals.trips(parsed, 79, ASKED)).isEmpty();
        assertThat(SofseArrivals.trips(parsed, 9999, ASKED)).isEmpty();

        List<Trip> renamed = SofseArrivals.renamedTrips(trips, Map.of("Retiro", "Retiro Mitre"));
        assertThat(renamed.get(0).destination()).isEqualTo("Retiro Mitre");
    }


    @Test
    void leeLasEstacionesYEmparejaPorUbicacion() throws IOException {
        List<Station> stations = SofseArrivals.parseStations(resource("sofse-estaciones-retiro.json"));

        assertThat(stations).extracting(Station::id).containsExactly(332, 463);
        // Retiro del Mitre (nuestras coordenadas) queda mas cerca de la estacion 332 que de la del San Martin.
        assertThat(SofseArrivals.nearest(stations, -34.5911, -58.3746, 450).id()).isEqualTo(332);
        assertThat(SofseArrivals.nearest(stations, -34.5886, -58.3739, 450).id()).isEqualTo(463);
        // Lejos de todas: ninguna.
        assertThat(SofseArrivals.nearest(stations, -34.70, -58.50, 450)).isNull();
    }

    @Test
    void leeLosRamalesYLasEstacionesRealesDelMitre() throws IOException {
        assertThat(SofseArrivals.parseBranchIds(resource("sofse-ramales-mitre.json"))).containsExactly(9, 7, 5, 33, 35);

        List<Station> suarez = SofseArrivals.parseStations(resource("sofse-estaciones-ramal-9.json"));
        assertThat(suarez).hasSize(15);
        // Los nombres no coinciden con los nuestros ("L.M.Drago", "J.L. Suárez"), la ubicacion si.
        assertThat(SofseArrivals.nearest(suarez, -34.5812, -58.5163, 450).name()).isEqualTo("Miguelete");
        assertThat(SofseArrivals.nearest(suarez, -34.5686, -58.4792, 450).id()).isEqualTo(236);
    }

    @Test
    void anotaLosTiposDeServicioYLasLeyendasConSuLinea() throws IOException {
        assertThat(SofseArrivals.serviceTypes(resource("sofse-arribos-271.json")))
                .containsExactly("Mitre: id 1 \"Normal\" (Pasajeros, subclasificacion 1)");
        JsonNode mixed = response(
                result(1, 300, false, "Tigre", 500, """
                        , "gerencia": {"nombre": "Mitre"},
                          "tipo": {"id": 2, "nombre": "Rápido", "clasificacion": {"nombre": "Pasajeros"}, "subclasificacion": 1},
                          "leyenda": "No se detiene en Belgrano C"
                        """),
                result(1, 600, false, "Tigre", 500, """
                        , "gerencia": {"nombre": "Mitre"},
                          "tipo": {"id": 2, "nombre": "Rápido", "clasificacion": {"nombre": "Pasajeros"}, "subclasificacion": 1},
                          "leyenda": {"texto": "Para en todas"}
                        """),
                result(1, 900, false, "Tigre", 500, ""));
        assertThat(SofseArrivals.serviceTypes(mixed))
                .containsExactly("Mitre: id 2 \"Rápido\" (Pasajeros, subclasificacion 1)");
        assertThat(SofseArrivals.legends(mixed))
                .containsExactly("Mitre: No se detiene en Belgrano C", "Mitre: {\"texto\":\"Para en todas\"}");
    }

    @Test
    void lasCabecerasDeLosRamalesSinRepetir() throws IOException {
        // Retiro (tres ramales), Victoria y Villa Ballester.
        assertThat(SofseArrivals.branchStarts(resource("sofse-ramales-mitre.json"))).containsExactly(332, 409, 412);
        assertThat(SofseArrivals.branchStarts(MAPPER.readTree("[{\"cabecera_inicial\": {\"id\": 7}}, {}]")))
                .containsExactly(7);
    }

    @Test
    void sinResultadosNoHayTrenes() throws IOException {
        Parsed parsed = SofseArrivals.parse(MAPPER.readTree("{\"timestamp\":1794505738,\"results\":[],\"total\":0}"), ASKED);
        assertThat(parsed.directions()).isEmpty();
        assertThat(parsed.scheduledOnly()).isTrue();
    }

    @Test
    void leeLosRamalesConIdOIdRamal() throws IOException {
        assertThat(SofseArrivals.parseBranchIds(MAPPER.readTree("[{\"id\": 9}, {\"id\": \"5\"}, {\"id\": 9}]")))
                .containsExactly(9, 5);
        assertThat(SofseArrivals.parseBranchIds(MAPPER.readTree("[{\"id_ramal\": \"7\", \"nombre\": \"Tigre\"}]")))
                .containsExactly(7);
    }

    @Test
    void sacaLaSiglaDeLaLineaDelNombre() {
        assertThat(SofseArrivals.cleanName("Retiro (LGM)")).isEqualTo("Retiro");
        assertThat(SofseArrivals.cleanName("Retiro - LSM")).isEqualTo("Retiro");
        assertThat(SofseArrivals.cleanName("Tigre (C)")).isEqualTo("Tigre (C)");
        assertThat(SofseArrivals.cleanName("J. L. Suarez")).isEqualTo("J. L. Suarez");
    }
}
