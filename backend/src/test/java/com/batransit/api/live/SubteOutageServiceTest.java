package com.batransit.api.live;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.live.SubteOutageService.Outage;
import com.batransit.api.noticias.NewsClassifier.Category;
import com.batransit.api.noticias.NewsService.NewsItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** Lineas de subte sin servicio: cuando se avisa y con que motivo. */
class SubteOutageServiceTest {

    /** Jueves 12/11/2026, 22:30 en Buenos Aires. */
    private static final Instant NOW = Instant.parse("2026-11-13T01:30:00Z");

    private static NewsItem news(String title, Duration ago) {
        return new NewsItem("n", title, "https://example.com", "La Nación", NOW.minus(ago), Category.SUBTE);
    }

    private static Map<String, Instant> allEmptySince(Duration ago) {
        Map<String, Instant> since = new HashMap<>();
        SubteOutageService.LINES.forEach(l -> since.put(l, NOW.minus(ago)));
        return since;
    }

    @Test
    void unHuecoCortoDelPronosticoNoEsFaltaDeServicio() {
        Map<String, Instant> since = Map.of("B", NOW.minus(Duration.ofMinutes(4)));
        assertThat(SubteOutageService.outages(since, NOW, Optional.empty())).isEmpty();
    }

    @Test
    void diezMinutosSinTrenesEsSinServicio() {
        Map<String, Instant> since = Map.of("B", NOW.minus(Duration.ofMinutes(12)));
        List<Outage> outages = SubteOutageService.outages(since, NOW, Optional.empty());

        assertThat(outages).extracting(Outage::lineCode).containsExactly("B");
        assertThat(outages.get(0).description())
                .isEqualTo("Sin servicio: el pronóstico en vivo no muestra trenes desde las 22:18.");
    }

    @Test
    void conUnaNoticiaDeParoDiceElMotivoYSumaElPremetro() {
        NewsItem paro = news("Empezó el paro de subte: afecta a todas las líneas hasta la medianoche",
                Duration.ofHours(1));
        Optional<NewsItem> strike = SubteOutageService.strikeNews(List.of(paro), NOW);
        List<Outage> outages = SubteOutageService.outages(allEmptySince(Duration.ofMinutes(30)), NOW, strike);

        assertThat(outages).hasSize(7);
        assertThat(outages.get(0).description()).startsWith("Sin servicio por paro, según las noticias de hoy.");
        assertThat(outages.get(6).lineCode()).isEqualTo("P");
        assertThat(outages.get(6).mode()).isEqualTo(TransportMode.PREMETRO);
    }

    @Test
    void conNoticiaDeParoYSinNingunaLineaSeAvisaAntes() {
        Optional<NewsItem> strike = SubteOutageService.strikeNews(
                List.of(news("Paro de subte en todas las líneas", Duration.ofHours(1))), NOW);
        assertThat(SubteOutageService.outages(allEmptySince(Duration.ofMinutes(4)), NOW, strike)).hasSize(7);
        // Sin la noticia, cuatro minutos todavia no alcanzan.
        assertThat(SubteOutageService.outages(allEmptySince(Duration.ofMinutes(4)), NOW, Optional.empty())).isEmpty();
    }

    @Test
    void elPremetroNoSeMarcaSiAndaAlgunaLineaOLaNoticiaNoLoIncluye() {
        Optional<NewsItem> soloSubte = SubteOutageService.strikeNews(
                List.of(news("Paro en la línea B del subte", Duration.ofHours(1))), NOW);
        assertThat(SubteOutageService.outages(allEmptySince(Duration.ofMinutes(30)), NOW, soloSubte))
                .extracting(Outage::lineCode).doesNotContain("P");

        Optional<NewsItem> todas = SubteOutageService.strikeNews(
                List.of(news("Paro de subte en todas las líneas y el premetro", Duration.ofHours(1))), NOW);
        Map<String, Instant> sinLaA = allEmptySince(Duration.ofMinutes(30));
        sinLaA.remove("A");
        assertThat(SubteOutageService.outages(sinLaA, NOW, todas)).extracting(Outage::lineCode).doesNotContain("P");
    }

    @Test
    void soloCuentanLasNoticiasRecientesDeParosDelSubte() {
        assertThat(SubteOutageService.mentionsStrike("Metrodelegados anuncian un paro para el jueves")).isTrue();
        assertThat(SubteOutageService.mentionsStrike("Medida de fuerza en el subte: cómo viajar")).isTrue();
        assertThat(SubteOutageService.mentionsStrike("Paro de colectivos en el AMBA")).isFalse();
        assertThat(SubteOutageService.mentionsStrike("Nuevas formaciones para la línea B")).isFalse();
        assertThat(SubteOutageService.strikeNews(
                List.of(news("Paro de subte en todas las líneas", Duration.ofDays(2))), NOW)).isEmpty();
    }

    private static String header(long timestamp) {
        return "{\"Header\": {\"timestamp\": " + timestamp + "}}";
    }

    @Test
    void elPronosticoCongeladoNoDiceNada() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        long old = NOW.minus(Duration.ofHours(1)).getEpochSecond();
        assertThat(SubteOutageService.frozen(mapper.readTree(header(old)), NOW)).isTrue();
        long fresh = NOW.minus(Duration.ofSeconds(40)).getEpochSecond();
        assertThat(SubteOutageService.frozen(mapper.readTree(header(fresh)), NOW)).isFalse();
        assertThat(SubteOutageService.frozen(mapper.readTree("{\"Entity\": []}"), NOW)).isFalse();
    }

    @Test
    void unaAlertaPorLineaYPorDia() {
        assertThat(SubteOutageService.externalId("B", java.time.LocalDate.of(2026, 11, 12)))
                .isEqualTo("subte-sin-servicio:B:2026-11-12");
    }

    private static final java.util.Set<String> CIUDAD_A_E = java.util.Set.of("A", "B", "C", "D", "E");

    private static NewsItem paroHastaMedianoche() {
        // Salio a las 19 (22 UTC) del jueves 12/11.
        return new NewsItem("n", "Empezó el paro de subte: afecta a todas las líneas hasta la medianoche",
                "https://example.com", "La Nación", Instant.parse("2026-11-12T22:00:00Z"), Category.SUBTE);
    }

    @Test
    void enUnParoDeTodaLaRedSeSumanLasQueFaltanYElPremetro() {
        // La Ciudad ya da por interrumpidas la A a la E; la H solo tiene un aviso viejo de demoras.
        List<Outage> result = SubteOutageService.withNetworkStrike(List.of(), CIUDAD_A_E,
                Optional.of(paroHastaMedianoche()), Instant.parse("2026-11-13T02:17:00Z"));

        assertThat(result).extracting(Outage::lineCode).containsExactly("H", "P");
        assertThat(result.get(1).mode()).isEqualTo(TransportMode.PREMETRO);
        assertThat(result.get(0).description()).isEqualTo("Sin servicio por paro, según las noticias de hoy.");
    }

    @Test
    void conPocasLineasParadasOTerminadoElParoNoSeSumaNada() {
        assertThat(SubteOutageService.withNetworkStrike(List.of(), java.util.Set.of("A", "B"),
                Optional.of(paroHastaMedianoche()), Instant.parse("2026-11-13T02:17:00Z"))).isEmpty();
        // 00:10 del viernes: ya termino.
        assertThat(SubteOutageService.withNetworkStrike(List.of(), CIUDAD_A_E,
                Optional.of(paroHastaMedianoche()), Instant.parse("2026-11-13T03:10:00Z"))).isEmpty();
    }

    @Test
    void laLineaQueYaInterrumpioLaCiudadNoSeRepite() {
        List<Outage> forecast = List.of(new Outage("B", TransportMode.SUBTE, "Sin servicio: ..."),
                new Outage("H", TransportMode.SUBTE, "Sin servicio: ..."));
        assertThat(SubteOutageService.withNetworkStrike(forecast, java.util.Set.of("B"), Optional.empty(), NOW))
                .extracting(Outage::lineCode).containsExactly("H");
    }

    @Test
    void elFinDelParoSaleDeLaNoticia() {
        assertThat(SubteOutageService.strikeEnd(paroHastaMedianoche()))
                .isEqualTo(Instant.parse("2026-11-13T03:00:00Z"));
        NewsItem hastaLas15 = new NewsItem("n", "Paro de subte en todas las líneas hasta las 15",
                "https://example.com", "Clarín", Instant.parse("2026-11-12T11:00:00Z"), Category.SUBTE);
        assertThat(SubteOutageService.strikeEnd(hastaLas15)).isEqualTo(Instant.parse("2026-11-12T18:00:00Z"));
        NewsItem sinHora = new NewsItem("n", "Paro de subte en todas las líneas", "https://example.com",
                "Clarín", Instant.parse("2026-11-12T11:00:00Z"), Category.SUBTE);
        assertThat(SubteOutageService.strikeEnd(sinHora)).isEqualTo(Instant.parse("2026-11-13T03:00:00Z"));
    }

    @Test
    void losAvisosDeLaCiudadPorElParo() {
        assertThat(SubteOutageService.mentionsStrikeText("Servicio interrumpido por medida de fuerza gremial."))
                .isTrue();
        assertThat(SubteOutageService.mentionsStrikeText("Estación Medrano cerrada por obras.")).isFalse();
    }
}
