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
