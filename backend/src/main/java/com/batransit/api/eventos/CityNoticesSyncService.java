package com.batransit.api.eventos;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.eventos.CityNoticesParser.Notice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cortes de transito que publica el Gobierno de la Ciudad en sus noticias,
 * leidos cada hora: el listado de Tránsito y las primeras paginas del
 * listado general (ahi salen tambien los operativos grandes, como el de
 * la visita del Papa, con otro rubro). Cada noticia que anuncia cortes se
 * guarda como un corte (source CIUDAD) con su titulo, resumen y enlace, y
 * se muestra una semana desde que se publico. Una noticia ya cargada (por
 * su url) no se vuelve a cargar.
 */
@Service
public class CityNoticesSyncService {

    private static final Logger log = LoggerFactory.getLogger(CityNoticesSyncService.class);

    static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    /** Cuanto se muestra cada corte desde el dia en que se publico. */
    static final Duration SHOWN_FOR = Duration.ofDays(7);
    /** Los listados que se leen (relativos al sitio). */
    static final List<String> PAGES = List.of("/noticias-relacionadas/Tr%C3%A1nsito", "/noticias", "/noticias?page=1");

    private final String baseUrl;
    private final RestClient restClient;
    private final PublicEventRepository repository;
    private final TransactionTemplate transactionTemplate;
    private SourceHealth health = SourceHealth.NOOP;

    @Autowired
    public CityNoticesSyncService(@Value("${app.eventos.ciudad-url:https://buenosaires.gob.ar}") String baseUrl,
                                  PublicEventRepository repository, PlatformTransactionManager transactionManager) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.repository = repository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
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

    @Scheduled(initialDelay = 90_000, fixedDelay = 60 * 60 * 1000L)
    public void sync() {
        Map<String, Notice> closures = new LinkedHashMap<>();
        int read = 0;
        for (String page : PAGES) {
            String html = get(page);
            if (html == null) {
                continue;
            }
            read++;
            for (Notice notice : CityNoticesParser.parse(html, baseUrl)) {
                if (CityNoticesParser.isClosure(notice)) {
                    closures.putIfAbsent(notice.url(), notice);
                }
            }
        }
        if (read == 0) {
            health.fail(SourceHealth.Source.CORTES_CIUDAD, "sin respuesta");
            return;
        }
        Instant now = Instant.now();
        try {
            Integer created = transactionTemplate.execute(status -> save(closures.values().stream().toList(), now));
            health.ok(SourceHealth.Source.CORTES_CIUDAD);
            if (created != null && created > 0) {
                log.info("Cortes de la Ciudad: {} nuevos.", created);
            }
        } catch (Exception e) {
            health.fail(SourceHealth.Source.CORTES_CIUDAD, "error al guardar");
            log.error("Cortes de la Ciudad: error al guardar ({})", e.getClass().getSimpleName());
        }
    }

    /** Guarda los cortes que no estaban y siguen vigentes; devuelve cuantos. */
    private int save(List<Notice> notices, Instant now) {
        int created = 0;
        for (Notice notice : notices) {
            Instant published = shownFrom(notice.published());
            Instant until = published.plus(SHOWN_FOR);
            if (!until.isAfter(now) || repository.existsByUrl(notice.url())) {
                continue;
            }
            repository.save(PublicEvent.fromCityNews(limit(notice.title(), 150), limit(notice.summary(), 500),
                    limit(notice.url(), 300), published, until));
            created++;
        }
        return created;
    }

    /** El dia de publicacion, desde las 0 h de Buenos Aires. */
    static Instant shownFrom(LocalDate published) {
        return published.atStartOfDay(ZONE).toInstant();
    }

    private static String limit(String text, int max) {
        if (text == null || text.length() <= max) {
            return text;
        }
        return text.substring(0, max - 1).strip() + "…";
    }

    /** El HTML de un listado, o null si no respondio. */
    String get(String path) {
        try {
            return restClient.get().uri(URI.create(baseUrl + path)).retrieve().body(String.class);
        } catch (RestClientException | IllegalArgumentException e) {
            log.warn("Cortes de la Ciudad: no respondio {} ({}).", path, e.getClass().getSimpleName());
            return null;
        }
    }
}
