package com.batransit.api.eventos;

import com.batransit.api.eventos.CityNoticesParser.Notice;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CityNoticesParserTest {

    private static final String BASE = "https://buenosaires.gob.ar";

    private static String resource(String name) throws IOException {
        try (InputStream in = CityNoticesParserTest.class.getResourceAsStream("/eventos/" + name)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void leeElListadoRealDeTransito() throws IOException {
        List<Notice> notices = CityNoticesParser.parse(resource("ciudad-transito.html"), BASE);

        assertThat(notices).hasSize(4);
        Notice first = notices.get(1);
        assertThat(first.title()).isEqualTo("Corte por evento el día sábado 24 de octubre");
        assertThat(first.summary()).isEqualTo("Conocé las afectaciones por evento deportivo.");
        assertThat(first.url()).isEqualTo(BASE + "/noticias/corte-por-evento-el-dia-sabado-24-de-octubre");
        assertThat(first.published()).isEqualTo(LocalDate.of(2026, 10, 20));
        assertThat(first.badges()).containsExactly("Cortes de tránsito", "Tránsito");
        // El Paseo del Bajo es de Tránsito, pero no anuncia cortes.
        assertThat(notices).filteredOn(CityNoticesParser::isClosure).extracting(Notice::title).containsExactly(
                "Corte por evento el día sábado 24 de octubre",
                "Corte por evento en Huracán los días 20 y 21 de octubre",
                "Corte por evento este domingo 18 de octubre");
    }

    @Test
    void delListadoGeneralTomaLosOperativosConOtroRubro() throws IOException {
        List<Notice> notices = CityNoticesParser.parse(resource("ciudad-noticias.html"), BASE);

        assertThat(notices).hasSize(5);
        List<Notice> closures = notices.stream().filter(CityNoticesParser::isClosure).toList();
        // El Papa (rubro "Visita de León XIV") y la maratón; no el corte de cinta, el subte ni la donación.
        assertThat(closures).extracting(Notice::title).containsExactly(
                "Por la visita del Papa, este sábado se cerraron las zonas de seguridad de Recoleta y Palermo: lo que hay que saber",
                "Llega la Maratón de la Ciudad: desvíos de colectivos y calles cerradas");
        // Las entidades del HTML se resuelven.
        assertThat(closures.get(1).summary()).isEqualTo("El domingo desde las 6 & hasta las 13 \"con cortes\".");
    }

    @Test
    void reconoceLosCortesPorElTexto() {
        assertThat(closure("Cortes y desvíos por evento este fin de semana")).isTrue();
        assertThat(closure("Afectaciones en Metrobus 9 de Julio: conocé los cortes")).isTrue();
        assertThat(closure("Avenida del Libertador cerrada al tránsito por el operativo")).isTrue();
        assertThat(closure("Restricciones de tránsito en Palermo")).isTrue();
        assertThat(closure("Cierre total de la Av. Corrientes por obra")).isTrue();
        assertThat(closure("La Corte Suprema falló a favor de la Ciudad")).isFalse();
        assertThat(closure("Cortes de luz programados en Caballito")).isFalse();
        assertThat(closure("Cierre del ciclo lectivo en las escuelas")).isFalse();
    }

    @Test
    void sinTarjetasNiFechaNoHayNoticias() {
        assertThat(CityNoticesParser.parse(null, BASE)).isEmpty();
        assertThat(CityNoticesParser.parse("<html><body>Mantenimiento</body></html>", BASE)).isEmpty();
        assertThat(CityNoticesParser.parse("<div class=\"card\"><a href=\"/noticias/x\" class=\"card-title-link\">Corte</a></div>",
                BASE)).isEmpty();
    }

    @Test
    void seMuestraDesdeElDiaDePublicacionEnBuenosAires() {
        assertThat(CityNoticesSyncService.shownFrom(LocalDate.of(2026, 11, 6)))
                .isEqualTo(Instant.parse("2026-11-06T03:00:00Z"));
    }

    private static boolean closure(String title) {
        return CityNoticesParser.isClosure(new Notice(title, null, BASE + "/x", LocalDate.of(2026, 11, 12), List.of()));
    }
}
