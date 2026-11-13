package com.batransit.api.trenes;

import com.batransit.api.domain.AlertType;
import com.batransit.api.trenes.SofseAlerts.SofseAlert;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SofseAlertsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    /** 12/11/2026 14:44 en Buenos Aires: la alerta del J.L. Suarez rige desde el 11 a las 13:27. */
    private static final Instant NOW = Instant.parse("2026-11-12T17:44:08Z");

    private static JsonNode resource(String name) throws IOException {
        try (InputStream in = SofseAlertsTest.class.getResourceAsStream("/trenes/" + name)) {
            return MAPPER.readTree(in);
        }
    }

    private static JsonNode branches(String alerts) throws IOException {
        return MAPPER.readTree("[{\"id\": 5, \"alerta\": [" + alerts + "]}, {\"id\": 7, \"alerta\": null}]");
    }

    private static String alert(int id, String effect, String text, String extra) {
        return """
                {"id": %d, "efecto_gtfs": "%s", "causa_gtfs": "OTHER_CAUSE", "contenido": "%s", "habilitado": 1%s}
                """.formatted(id, effect, text, extra);
    }

    @Test
    void leeLaAlertaRealDelMitre() throws IOException {
        List<SofseAlert> alerts = SofseAlerts.parse(resource("sofse-ramales-mitre.json"), NOW);

        assertThat(alerts).hasSize(1);
        SofseAlert alert = alerts.get(0);
        assertThat(alert.id()).isEqualTo(99609);
        assertThat(alert.type()).isEqualTo(AlertType.INTERRUPCION);
        // Los espacios de mas del texto se limpian.
        assertThat(alert.description()).isEqualTo(
                "El servicio J.L. Suárez se encuentra interrumpido tras fallas en el suministro electrico. Disculpa las molestias");
        assertThat(alert.effect()).isEqualTo(1);
        assertThat(alert.cause()).isEqualTo(2);
        // Es del ramal Retiro-J.L. Suárez: termina en la estacion 190.
        assertThat(alert.branchEnd()).isEqualTo(190);
        // Antes de que empiece a regir, no.
        assertThat(SofseAlerts.parse(resource("sofse-ramales-mitre.json"), Instant.parse("2026-11-11T16:00:00Z")))
                .isEmpty();
    }

    @Test
    void soloLasHabilitadasYVigentesYUnaVezAunqueEsteEnVariosRamales() throws IOException {
        JsonNode node = MAPPER.readTree("["
                + "{\"id\": 5, \"alerta\": [" + alert(1, "SIGNIFICANT_DELAYS", "Demoras por manifestación", "") + "]},"
                + "{\"id\": 7, \"alerta\": [" + alert(1, "SIGNIFICANT_DELAYS", "Demoras por manifestación", "") + ","
                + alert(2, "NO_SERVICE", "Apagada", ", \"habilitado\": 0") + ","
                + alert(3, "NO_SERVICE", "Vencida", ", \"vigencia_hasta\": \"2026-11-12 10:00:00\"") + ","
                + alert(4, "DETOUR", "Vigente hasta mañana", ", \"vigencia_hasta\": \"2026-11-13 10:00:00\"") + ","
                + alert(5, "NO_SERVICE", "   ", "") + "]}]");

        List<SofseAlert> alerts = SofseAlerts.parse(node, NOW);

        assertThat(alerts).extracting(SofseAlert::id).containsExactly(1, 4);
        assertThat(alerts).extracting(SofseAlert::type).containsExactly(AlertType.DEMORA, AlertType.DESVIO);
        assertThat(SofseAlerts.parse(branches(""), NOW)).isEmpty();
    }

    @Test
    void losAvisosDeServicioNormalizadoNoSonAlertas() throws IOException {
        // Tal como lo mando la API para el Tren de la Costa (12/11/2026, en verde y por 23 minutos).
        JsonNode node = MAPPER.readTree("[{\"id\": 41, \"alerta\": [" + alert(99694, "OTHER_EFFECT",
                "El servicio se encuentra normalizado tras fallas en el sistema de alimentación eléctrica.",
                ", \"criticidad_orden\": 4, \"criticidad_color_fondo\": \"#dff0d8\"") + ","
                + alert(2, "OTHER_EFFECT", "Servicio restablecido entre Maipú y Delta", "") + ","
                + alert(4, "REDUCED_SERVICE", "Servicio limitado hasta que se normalice la situación",
                ", \"criticidad_color_fondo\": \"#fcf8e3\"") + "]}]");

        assertThat(SofseAlerts.parse(node, NOW)).extracting(SofseAlert::id).containsExactly(4);
    }

    @Test
    void elServicioQueSeReanudaNoEsAlerta() throws IOException {
        // Tal como lo mando la API para el Mitre (12/11/2026), como demora.
        JsonNode node = MAPPER.readTree("[{\"id\": 9, \"alerta\": [" + alert(1, "SIGNIFICANT_DELAYS",
                "El servicio José L. Suárez reanuda su recorrido completo entre cabeceras tras fallas en el "
                        + "suministro eléctrico.", "") + ","
                + alert(2, "OTHER_EFFECT", "Los trenes vuelven a circular entre Tigre y Retiro.", "") + ","
                + alert(3, "NO_SERVICE", "Sin servicio. El servicio se reanudará a las 23 hs.", "") + "]}]");

        // El que dice que se reanudara (todavia no anda) sigue siendo alerta.
        assertThat(SofseAlerts.parse(node, NOW)).extracting(SofseAlert::id).containsExactly(3);
    }

    @Test
    void laAlertaDeUnTrenPuntualTerminaCuandoElTrenYaPaso() throws IOException {
        // Tal como estaban en el Sarmiento (12/11/2026), sin fecha de fin.
        JsonNode node = MAPPER.readTree("[{\"id\": 51, \"alerta\": [" + alert(99691, "SIGNIFICANT_DELAYS",
                "El tren de 17:59 hs de Jáuregui a Moreno circula con 13 minutos aproximadamente de demora por "
                        + "problemas técnicos. Disculpá las molestias ocasionadas.",
                ", \"vigencia_desde\": \"2026-11-12 17:54:00\"") + ","
                + alert(99697, "SIGNIFICANT_DELAYS", "El tren de 18:52 hs de Moreno a Mercedes se encuentra demorado "
                        + "en su partida por problemas técnicos.", ", \"vigencia_desde\": \"2026-11-12 19:04:00\"") + "]}]");

        // 18:30: los dos siguen (el de las 17:59, con 13 de demora, vale hasta las 18:57).
        assertThat(SofseAlerts.parse(node, Instant.parse("2026-11-12T21:30:00Z"))).extracting(SofseAlert::id)
                .containsExactly(99691);
        // 19:09: el de las 17:59 ya paso; el de las 18:52 sigue hasta las 19:37.
        assertThat(SofseAlerts.parse(node, Instant.parse("2026-11-12T22:09:00Z"))).extracting(SofseAlert::id)
                .containsExactly(99697);
        assertThat(SofseAlerts.parse(node, Instant.parse("2026-11-12T22:40:00Z"))).isEmpty();
    }

    @Test
    void unTrenDeLaMadrugadaAvisadoLaNocheAnterior() throws IOException {
        JsonNode node = MAPPER.readTree("[{\"id\": 1, \"alerta\": [" + alert(5, "NO_SERVICE",
                "El tren de las 5.10 de Once a Moreno no circulará.", ", \"vigencia_desde\": \"2026-11-12 22:00:00\"")
                + "]}]");
        // A las 23 sigue: es del 13 a la madrugada.
        assertThat(SofseAlerts.parse(node, Instant.parse("2026-11-13T02:00:00Z"))).hasSize(1);
        assertThat(SofseAlerts.parse(node, Instant.parse("2026-11-13T09:00:00Z"))).isEmpty();
    }

    @Test
    void elVerdeNoQuiereDecirNormalizado() throws IOException {
        // Tal como estaba en el Belgrano Sur (12/11/2026): en verde, pero el servicio sigue limitado.
        JsonNode node = MAPPER.readTree("[{\"id\": 21, \"id_estacion_final\": 263, \"alerta\": [" + alert(96776,
                "OTHER_EFFECT", "Los trenes del ramal Dr. Sáenz - M.C.G. Belgrano circulan con recorrido limitado "
                        + "entre Tapiales y M.C.G. Belgrano, por obras. Más información en trenesargentinos.gob.ar  ",
                ", \"criticidad_color_fondo\": \"#dff0d8\"") + "]}]");

        List<SofseAlert> alerts = SofseAlerts.parse(node, NOW);
        assertThat(alerts).extracting(SofseAlert::id).containsExactly(96776);
        assertThat(alerts.get(0).type()).isEqualTo(AlertType.OBRA);
        assertThat(alerts.get(0).branchEnd()).isEqualTo(263);
    }

    @Test
    void laMismaAlertaEnDosRamalesEsDeLaLinea() throws IOException {
        JsonNode node = MAPPER.readTree("["
                + "{\"id\": 25, \"cabecera_final\": {\"id\": 150}, \"alerta\": ["
                + alert(1, "SIGNIFICANT_DELAYS", "Demoras en todos los ramales", "") + ","
                + alert(2, "SIGNIFICANT_DELAYS", "El servicio G. Catán circula con demoras", "") + "]},"
                + "{\"id\": 21, \"cabecera_final\": {\"id\": 263}, \"alerta\": ["
                + alert(1, "SIGNIFICANT_DELAYS", "Demoras en todos los ramales", "") + "]}]");

        List<SofseAlert> alerts = SofseAlerts.parse(node, NOW);
        assertThat(alerts).extracting(SofseAlert::id).containsExactly(1, 2);
        assertThat(alerts.get(0).branchEnd()).isNull();
        assertThat(alerts.get(1).branchEnd()).isEqualTo(150);
    }

    @Test
    void conEfectoGenericoElTipoSaleDelTexto() {
        assertThat(SofseAlerts.typeOf("OTHER_EFFECT", "OTHER_CAUSE", "Servicio suspendido entre A y B"))
                .isEqualTo(AlertType.INTERRUPCION);
        assertThat(SofseAlerts.typeOf("UNKNOWN_EFFECT", "OTHER_CAUSE", "Trenes con demora"))
                .isEqualTo(AlertType.DEMORA);
        assertThat(SofseAlerts.typeOf("OTHER_EFFECT", "MAINTENANCE", "Trabajos en la vía"))
                .isEqualTo(AlertType.OBRA);
        assertThat(SofseAlerts.typeOf("NO_EFFECT", "OTHER_CAUSE", "Los trenes salen del andén 4"))
                .isEqualTo(AlertType.DESVIO);
        assertThat(SofseAlerts.typeOf("REDUCED_SERVICE", "STRIKE", "Medida de fuerza"))
                .isEqualTo(AlertType.DEMORA);
    }

    @Test
    void elIdGuardadoDiceDeQueLineaEs() {
        assertThat(SofseAlerts.externalId("MITRE", 99609)).isEqualTo("sofse:MITRE:99609");
        assertThat(SofseAlerts.lineOf("sofse:MITRE:99609")).isEqualTo("MITRE");
        assertThat(SofseAlerts.lineOf("sofse:TREN_DE_LA_COSTA:1")).isEqualTo("TREN_DE_LA_COSTA");
        assertThat(SofseAlerts.lineOf("trenes-ar:MITRE:abc")).isEqualTo("");
        assertThat(SofseAlerts.lineOf(null)).isEqualTo("");
    }
}
