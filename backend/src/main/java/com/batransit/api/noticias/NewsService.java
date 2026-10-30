package com.batransit.api.noticias;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.noticias.NewsClassifier.Category;
import com.batransit.api.noticias.RssParser.RssItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Noticias del transporte del AMBA: cada 30 minutos lee los feeds RSS de
 * FEEDS, se queda con las notas de los ultimos dias que son del AMBA
 * (NewsClassifier) y guarda las MAX_ITEMS mas nuevas. Solo titular,
 * fuente, fecha y link: el texto queda en el sitio de cada medio. Si un
 * feed falla se conserva lo ultimo que se leyo de el.
 */
@Service
public class NewsService {

    private static final Logger log = LoggerFactory.getLogger(NewsService.class);
    static final int MAX_ITEMS = 30;
    static final Duration MAX_AGE = Duration.ofDays(7);

    /** Un feed: nombre (si el feed no trae el medio en cada nota) y direccion. */
    public record Feed(String name, String url) {
    }

    private static final String GOOGLE = "https://news.google.com/rss/search?hl=es-419&gl=AR&ceid=AR:es-419&q=";
    static final List<Feed> FEEDS = List.of(
            new Feed("enelSubte", "https://enelsubte.com/feed/"),
            new Feed("Google Noticias", GOOGLE + "subte+buenos+aires+when:7d"),
            new Feed("Google Noticias", GOOGLE + "trenes+AMBA+when:7d"),
            new Feed("Google Noticias", GOOGLE + "colectivos+AMBA+when:7d"));

    /** Una nota lista para mostrar. */
    public record NewsItem(String id, String title, String url, String source, Instant publishedAt, Category category) {
    }

    public record NewsResponse(Instant updatedAt, List<NewsItem> items) {
    }

    private final RestClient restClient;
    private SourceHealth health = SourceHealth.NOOP;
    private final java.util.Map<String, List<RssItem>> lastByFeed = new java.util.concurrent.ConcurrentHashMap<>();
    private volatile NewsResponse current = new NewsResponse(null, List.of());

    public NewsService() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(15_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory)
                .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
    }

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    public NewsResponse current() {
        return current;
    }

    @Scheduled(initialDelay = 45_000L, fixedDelay = 30 * 60_000L)
    public void refresh() {
        int ok = 0;
        String lastError = null;
        for (Feed feed : FEEDS) {
            try {
                String xml = restClient.get().uri(java.net.URI.create(feed.url())).retrieve().body(String.class);
                List<RssItem> items = RssParser.parse(xml, feed.name());
                if (!items.isEmpty()) {
                    lastByFeed.put(feed.url(), items);
                    ok++;
                } else {
                    lastError = "feed vacío o con otro formato";
                }
            } catch (RestClientException | IllegalArgumentException e) {
                lastError = e.getClass().getSimpleName();
            }
        }
        List<RssItem> all = new ArrayList<>();
        lastByFeed.values().forEach(all::addAll);
        Instant now = Instant.now();
        current = new NewsResponse(now, select(all, now));
        if (ok > 0) {
            health.ok(SourceHealth.Source.NOTICIAS);
        } else {
            health.fail(SourceHealth.Source.NOTICIAS, lastError == null ? "sin respuesta" : lastError);
        }
        log.info("Noticias: {} de {} feeds respondieron, {} notas", ok, FEEDS.size(), current.items().size());
    }

    /**
     * Las notas del AMBA de los ultimos MAX_AGE, sin repetidas (mismo
     * titular en dos feeds), de la mas nueva a la mas vieja.
     */
    static List<NewsItem> select(List<RssItem> items, Instant now) {
        Set<String> seen = new HashSet<>();
        return items.stream()
                .filter(i -> i.publishedAt() != null && i.publishedAt().isAfter(now.minus(MAX_AGE))
                        && !i.publishedAt().isAfter(now.plus(Duration.ofHours(1))))
                .sorted(Comparator.comparing(RssItem::publishedAt).reversed())
                .map(i -> new Object[]{i, NewsClassifier.classify(i.title())})
                .filter(pair -> pair[1] != null)
                .filter(pair -> seen.add(key(((RssItem) pair[0]).title())))
                .limit(MAX_ITEMS)
                .map(pair -> {
                    RssItem i = (RssItem) pair[0];
                    return new NewsItem(Integer.toHexString(i.link().hashCode()), i.title(), i.link(), i.source(),
                            i.publishedAt(), (Category) pair[1]);
                })
                .toList();
    }

    /** El titular sin acentos ni signos: dos medios con el mismo cable cuentan como una nota. */
    static String key(String title) {
        return NewsClassifier.normalize(title).replaceAll("[^a-z0-9]+", " ").strip();
    }
}
