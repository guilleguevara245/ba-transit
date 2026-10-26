package com.batransit.api.clima;

import com.batransit.api.clima.CapParser.CapAlert;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Los XML de prueba siguen la estructura de CAP 1.2. Son ejemplos
 * armados para los tests, no copias de alertas reales del SMN.
 */
class CapParserTest {

    static final String INDEX = """
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0"><channel><title>Alertas</title>
              <item><title>Tormentas</title><link>https://ssl.smn.gob.ar/feeds/CAP/CAP_20261025180000_1.xml</link></item>
              <item><title>Calor</title><link>/feeds/CAP/CAP_20261025180000_2.xml</link></item>
            </channel></rss>
            """;

    static String cap(String id, String msgType, String references, String event, String headline,
                      String severity, String expires, String areaDesc, String polygon) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
                  <identifier>%s</identifier>
                  <sender>smn.gob.ar</sender>
                  <sent>2026-10-25T18:00:00-03:00</sent>
                  <status>Actual</status>
                  <msgType>%s</msgType>
                  <scope>Public</scope>
                  %s
                  <info>
                    <language>es-AR</language>
                    <category>Met</category>
                    <event>%s</event>
                    <urgency>Expected</urgency>
                    <severity>%s</severity>
                    <certainty>Likely</certainty>
                    <onset>2026-10-25T21:00:00-03:00</onset>
                    <expires>%s</expires>
                    <headline>%s</headline>
                    <description>Tormentas fuertes con caida de granizo y rafagas.</description>
                    <instruction>Evita salir si no es necesario.</instruction>
                    <area>
                      <areaDesc>%s</areaDesc>
                      <polygon>%s</polygon>
                    </area>
                  </info>
                </alert>
                """.formatted(id, msgType, references, event, severity, expires, headline, areaDesc, polygon);
    }

    /** Cuadrado que cubre la Ciudad y el conurbano. */
    static final String AMBA_POLYGON = "-34.4,-58.8 -34.4,-58.1 -34.9,-58.1 -34.9,-58.8 -34.4,-58.8";
    /** Cuadrado en Mendoza. */
    static final String MENDOZA_POLYGON = "-32.5,-69.2 -32.5,-68.5 -33.2,-68.5 -33.2,-69.2 -32.5,-69.2";

    /** Documento real del SMN (25/10/2026, tormentas en Chubut), recortado solo en las instrucciones. */
    static final String SMN_REAL = """
            <?xml version="1.0"?>
            <?xml-stylesheet type="text/xsl" href="https://ssl.smn.gob.ar/feeds/CAP/estilo_cap_interno_2026.xsl"?>
            <alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>urn:oid:2.49.0.1.32.0.2026.10.25.20.39.12.5</identifier><sender>smn@smn.gob.ar</sender><sent>2026-10-25T20:39:12-03:00</sent><status>Actual</status><msgType>Update</msgType><scope>Public</scope><references>smn@smn.gob.ar,urn:oid:2.49.0.1.32.0.2026.10.25.08.54.27,2026-10-25T08:54:27-03:00</references><info><language>es-AR</language><category>Met</category><event>Tormentas</event><urgency>Future</urgency><severity>Moderate</severity><certainty>Likely</certainty><onset>2026-10-26T21:00:00-03:00</onset><expires>2026-10-27T02:59:59-03:00</expires><senderName>Servicio Meteorologico Nacional</senderName><headline>Tormentas</headline><description>El &#xE1;rea ser&#xE1; afectada por tormentas de variada intensidad.</description><instruction>1- Evit&#xE1; salir.</instruction><web>https://www.smn.gob.ar/alertas</web><contact>pronos@smn.gob.ar</contact><area><areaDesc></areaDesc><polygon>-45.06,-66.62 -45.08,-66.68 -45.14,-66.72 -45.16,-66.82 -45.16,-66.92 -45.24,-67.1 -45.4,-67.28 -45.64,-67.48 -45.74,-67.52 -45.82,-67.6 -45.96,-67.72 -46,-67.84 -46,-69.66 -45.98,-69.66 -44.68,-69.64 -44.68,-67.1 -44.74,-67.1 -44.68,-67.06 -44.66,-67.02 -44.64,-67 -44.68,-66.98 -44.88,-66.82 -45.06,-66.82 -45.06,-66.62</polygon></area></info></alert>
            """;

    /** Fragmento del indice real: el SMN lo sirve como pagina HTML. */
    static final String SMN_INDEX_HTML = """
            <!DOCTYPE html>
            <html><head><title>RSS CAP SMN</title></head><body>
            <div class="item"><div class="titulo">Tormentas</div><div class="link">
            <a href="https://ssl.smn.gob.ar/feeds/CAP/xml_generados/CAP_20261025203924_Tormenta_Patagonia_alertas_alertas_5.xml" target="_blank">Ver XML CAP</a>
            </div></div>
            <div class="item"><div class="titulo">Nevadas</div><div class="link">
            <a href="https://ssl.smn.gob.ar/feeds/CAP/xml_generados/CAP_20261025203922_Nevada_Cordillera_alertas_alertas_2.xml" target="_blank">Ver XML CAP</a>
            </div></div>
            </body></html>
            """;

    @Test
    void leeElIndiceHtmlDelSmn() {
        assertThat(CapParser.parseIndex(SMN_INDEX_HTML)).containsExactly(
                "https://ssl.smn.gob.ar/feeds/CAP/xml_generados/CAP_20261025203924_Tormenta_Patagonia_alertas_alertas_5.xml",
                "https://ssl.smn.gob.ar/feeds/CAP/xml_generados/CAP_20261025203922_Nevada_Cordillera_alertas_alertas_2.xml");
    }

    @Test
    void leeUnDocumentoRealDelSmn() {
        CapAlert alert = CapParser.parseAlert(SMN_REAL).orElseThrow();

        assertThat(alert.kind()).isEqualTo("TORMENTAS");
        // El SMN no pone el color en el texto: Moderate = amarilla.
        assertThat(alert.level()).isEqualTo("AMARILLA");
        assertThat(alert.msgType()).isEqualTo("Update");
        assertThat(alert.references()).containsExactly("urn:oid:2.49.0.1.32.0.2026.10.25.08.54.27");
        assertThat(alert.areas()).isEmpty();
        assertThat(alert.description()).startsWith("El área será afectada");
        // Es en Chubut: no toca el AMBA.
        assertThat(WeatherAlertService.affectsAmba(alert)).isFalse();
    }

    @Test
    void leeLosEnlacesDelIndice() {
        assertThat(CapParser.parseIndex(INDEX)).containsExactly(
                "https://ssl.smn.gob.ar/feeds/CAP/CAP_20261025180000_1.xml", "/feeds/CAP/CAP_20261025180000_2.xml");
    }

    @Test
    void leeUnaAlertaCap() {
        CapAlert alert = CapParser.parseAlert(cap("A1", "Alert", "", "Tormentas",
                "Alerta amarilla por tormentas", "Moderate", "2026-10-26T06:00:00-03:00",
                "Ciudad Autonoma de Buenos Aires", AMBA_POLYGON)).orElseThrow();

        assertThat(alert.identifier()).isEqualTo("A1");
        assertThat(alert.kind()).isEqualTo("TORMENTAS");
        assertThat(alert.level()).isEqualTo("AMARILLA");
        assertThat(alert.expires()).isEqualTo(OffsetDateTime.parse("2026-10-26T06:00:00-03:00"));
        assertThat(alert.polygons()).hasSize(1);
        assertThat(alert.instruction()).contains("Evita salir");
    }

    @Test
    void sinColorEnElTextoUsaLaGravedad() {
        assertThat(CapParser.detectLevel("Alerta por calor extremo", "Severe")).isEqualTo("NARANJA");
        assertThat(CapParser.detectLevel("Aviso", "Minor")).isNull();
        assertThat(CapParser.detectLevel("Nivel naranja", "Moderate")).isEqualTo("NARANJA");
    }

    @Test
    void reconoceElTipoDeFenomeno() {
        assertThat(CapParser.detectKind("Lluvias intensas")).isEqualTo("LLUVIAS");
        assertThat(CapParser.detectKind("Temperaturas extremas (calor)")).isEqualTo("CALOR");
        assertThat(CapParser.detectKind("Viento Zonda")).isEqualTo("VIENTO");
    }

    @Test
    void xmlInvalidoNoEsAlerta() {
        assertThat(CapParser.parseAlert("no es xml")).isEmpty();
        assertThat(CapParser.parseAlert("<rss/>")).isEmpty();
    }

    @Test
    void puntoEnPoligono() {
        List<double[]> square = CapParser.parsePolygon(AMBA_POLYGON);
        assertThat(CapParser.contains(square, -34.6037, -58.3816)).isTrue();
        assertThat(CapParser.contains(square, -31.4, -64.2)).isFalse();
    }
}
