package com.batransit.api.noticias;

import com.batransit.api.noticias.NewsClassifier.Category;
import com.batransit.api.noticias.NewsService.NewsItem;
import com.batransit.api.noticias.RssParser.RssItem;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Feeds RSS, clasificacion y seleccion de las noticias. */
class NewsTest {

    private static final Instant NOW = Instant.parse("2026-10-29T22:00:00Z");

    private static final String WORDPRESS = """
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
            <channel><title>enelSubte</title>
              <item>
                <title>La línea E suma trenes nuevos &#8211; desde el lunes</title>
                <link>https://enelsubte.com/noticias/linea-e-trenes/</link>
                <pubDate>Thu, 29 Oct 2026 18:30:00 +0000</pubDate>
                <content:encoded><![CDATA[<p>Texto completo que no se usa</p>]]></content:encoded>
              </item>
              <item>
                <title>Santiago de Chile inaugura la línea 7 de su metro</title>
                <link>https://enelsubte.com/noticias/santiago/</link>
                <pubDate>Wed, 28 Oct 2026 12:00:00 +0000</pubDate>
              </item>
              <item><title>Sin link</title><link>javascript:alert(1)</link></item>
            </channel></rss>
            """;

    private static final String GOOGLE = """
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0"><channel>
              <item>
                <title>Paro de trenes: cómo funcionan el Roca y el Sarmiento - Clarín</title>
                <link>https://news.google.com/rss/articles/abc</link>
                <pubDate>Thu, 29 Oct 2026 20:00:00 GMT</pubDate>
                <source url="https://www.clarin.com">Clarín</source>
              </item>
              <item>
                <title>Aumenta el boleto de colectivo en el AMBA desde noviembre - Página 12</title>
                <link>https://news.google.com/rss/articles/def</link>
                <pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate>
                <source url="https://www.pagina12.com.ar">Página 12</source>
              </item>
            </channel></rss>
            """;

    @Test
    void leeFeedsDeWordpressYGoogle() {
        List<RssItem> wp = RssParser.parse(WORDPRESS, "enelSubte");
        assertThat(wp.size()).isEqualTo(2);
        assertThat(wp.get(0).title()).isEqualTo("La línea E suma trenes nuevos – desde el lunes");
        assertThat(wp.get(0).source()).isEqualTo("enelSubte");
        assertThat(wp.get(0).publishedAt()).isEqualTo(Instant.parse("2026-10-29T18:30:00Z"));

        List<RssItem> google = RssParser.parse(GOOGLE, "Google Noticias");
        assertThat(google.get(0).title()).isEqualTo("Paro de trenes: cómo funcionan el Roca y el Sarmiento");
        assertThat(google.get(0).source()).isEqualTo("Clarín");
    }

    @Test
    void noAceptaXmlConDoctypeNiBasura() {
        String xxe = "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
                + "<rss><channel><item><title>&x;</title><link>https://a.b/</link></item></channel></rss>";
        assertThat(RssParser.parse(xxe, "x").isEmpty()).isEqualTo(true);
        assertThat(RssParser.parse("no es xml", "x").isEmpty()).isEqualTo(true);
        assertThat(RssParser.parse(null, "x").isEmpty()).isEqualTo(true);
    }

    @Test
    void clasificaPorTema() {
        assertThat(NewsClassifier.classify("La línea E suma trenes nuevos")).isEqualTo(Category.SUBTE);
        assertThat(NewsClassifier.classify("Emova anunció obras en el Premetro")).isEqualTo(Category.SUBTE);
        assertThat(NewsClassifier.classify("Paro de trenes: el Roca y el Sarmiento")).isEqualTo(Category.TRENES);
        assertThat(NewsClassifier.classify("Aumenta el boleto de colectivo en el AMBA")).isEqualTo(Category.COLECTIVOS);
        assertThat(NewsClassifier.classify("Suben los peajes de las autopistas porteñas")).isEqualTo(Category.GENERAL);
        // De otro lugar o que no es de transporte.
        assertThat(NewsClassifier.classify("Santiago de Chile inaugura la línea 7 de su metro")).isEqualTo(null);
        assertThat(NewsClassifier.classify("Córdoba: nuevo tren de las sierras")).isEqualTo(null);
        assertThat(NewsClassifier.classify("Buenos Aires tendrá un fin de semana soleado")).isEqualTo(null);
        // Una calle de la Ciudad con nombre de otra provincia no la descarta.
        assertThat(NewsClassifier.classify("Corte en Av. Córdoba: desvíos de colectivos en la Ciudad de Buenos Aires"))
                .isEqualTo(Category.COLECTIVOS);
    }

    @Test
    void eligeLasNuevasDelAmbaSinRepetir() {
        List<RssItem> all = List.of(
                new RssItem("Paro de trenes en el AMBA", "https://a.com/1", "Clarín", Instant.parse("2026-10-29T20:00:00Z")),
                new RssItem("Paro de trenes en el AMBA", "https://b.com/1", "La Nación", Instant.parse("2026-10-29T19:00:00Z")),
                new RssItem("La línea B cierra temprano", "https://c.com/1", "enelSubte", Instant.parse("2026-10-29T21:00:00Z")),
                new RssItem("Subte: nota vieja", "https://d.com/1", "enelSubte", Instant.parse("2026-10-01T10:00:00Z")),
                new RssItem("Subte sin fecha", "https://e.com/1", "enelSubte", null),
                new RssItem("Receta de empanadas", "https://f.com/1", "Otro", Instant.parse("2026-10-29T21:30:00Z")));
        List<NewsItem> picked = NewsService.select(all, NOW);
        assertThat(picked.size()).isEqualTo(2);
        assertThat(picked.get(0).title()).isEqualTo("La línea B cierra temprano");
        assertThat(picked.get(0).category()).isEqualTo(Category.SUBTE);
        assertThat(picked.get(1).source()).isEqualTo("Clarín");
        assertThat(picked.get(1).category()).isEqualTo(Category.TRENES);
    }
}
