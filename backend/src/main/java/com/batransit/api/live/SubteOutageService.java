package com.batransit.api.live;

import com.batransit.api.domain.Alert;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.live.TransporteLiveClient.Fetched;
import com.batransit.api.noticias.NewsService;
import com.batransit.api.noticias.NewsService.NewsItem;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Lineas de subte sin servicio (paro o corte total), que la API del GCBA
 * no siempre avisa: si en horario de servicio el pronostico en vivo de una
 * linea sigue sin ningun tren durante CONFIRM, se guarda una alerta
 * "Sin servicio" de la linea; cuando vuelven a aparecer trenes (o termina
 * el horario), se da de baja. Si una noticia reciente habla de un paro, se
 * dice el motivo; el Premetro (que no esta en el pronostico) se marca solo
 * si estan todas las lineas sin trenes y la noticia lo nombra o habla de
 * todas las lineas.
 *
 * Si el pronostico no responde o esta congelado, no se toca nada.
 */
@Service
public class SubteOutageService {

    private static final Logger log = LoggerFactory.getLogger(SubteOutageService.class);

    static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    /** Distinta de la de los avisos del GCBA: su sincronizacion da de baja las suyas que no estan en el feed. */
    static final String SOURCE_NAME = "Pronóstico en vivo (API Transporte GCBA)";
    static final String ID_PREFIX = "subte-sin-servicio:";
    static final List<String> LINES = List.of("A", "B", "C", "D", "E", "H");
    /** Cuanto tiene que seguir una linea sin trenes para avisar (un hueco del pronostico no es un paro). */
    static final Duration CONFIRM = Duration.ofMinutes(10);
    /** Lejos del primer y del ultimo tren del dia no se avisa (los horarios de punta varian un poco). */
    static final int SCHEDULE_MARGIN_SECONDS = 20 * 60;
    /** Un pronostico con el encabezado mas viejo que esto esta congelado: no dice nada de los trenes. */
    static final Duration STALE_FEED = Duration.ofMinutes(30);
    /** Las noticias que cuentan para el motivo: las de las ultimas horas. */
    static final Duration NEWS_WINDOW = Duration.ofHours(18);

    private static final Pattern STRIKE = Pattern.compile("\\b(paro|paros|huelga|medida de fuerza)\\b");
    private static final Pattern SUBWAY = Pattern.compile(
            "\\b(subtes?|subterraneos?|premetro|emova|metrodelegados|linea [a-eh])\\b");
    private static final Pattern ALL_LINES = Pattern.compile("\\b(premetro|todas las lineas|toda la red)\\b");
    private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("HH:mm");

    private final TransporteLiveClient client;
    private final SubteScheduleService schedule;
    private final NewsService news;
    private final AlertRepository alertRepository;
    private final TransportLineRepository lineRepository;
    private final TransactionTemplate transactionTemplate;
    /** Por linea, desde cuando el pronostico no trae trenes (en horario de servicio). */
    private final Map<String, Instant> emptySince = new ConcurrentHashMap<>();

    public SubteOutageService(TransporteLiveClient client, SubteScheduleService schedule, NewsService news,
                              AlertRepository alertRepository, TransportLineRepository lineRepository,
                              PlatformTransactionManager transactionManager) {
        this.client = client;
        this.schedule = schedule;
        this.news = news;
        this.alertRepository = alertRepository;
        this.lineRepository = lineRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /** Una linea sin servicio y la descripcion de su alerta. */
    record Outage(String lineCode, TransportMode mode, String description) {
    }

    @Scheduled(initialDelay = 150_000L, fixedDelay = 2 * 60_000L)
    public void check() {
        Optional<Fetched> feed = client.get("/subtes/forecastGTFS", SubteArrivalsController.MAX_AGE);
        if (feed.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        JsonNode body = feed.get().body();
        if (frozen(body, now)) {
            log.warn("Subte sin servicio: el pronostico esta congelado; no se toca nada.");
            return;
        }
        Set<String> running = SubteArrivals.linesWithTrains(body, now.getEpochSecond());
        LocalDateTime local = LocalDateTime.ofInstant(now, BUENOS_AIRES);
        for (String line : LINES) {
            if (running.contains(line) || !schedule.inService(line, local, SCHEDULE_MARGIN_SECONDS)) {
                emptySince.remove(line);
            } else {
                emptySince.putIfAbsent(line, now);
            }
        }
        List<NewsItem> items = news.current() == null ? List.of() : news.current().items();
        List<Outage> outages = outages(emptySince, now, strikeNews(items, now));
        try {
            transactionTemplate.executeWithoutResult(s -> apply(outages, local.toLocalDate()));
        } catch (Exception e) {
            log.error("Subte sin servicio: error al guardar ({})", e.getClass().getSimpleName());
        }
    }

    /** Si el encabezado del pronostico es demasiado viejo (sin encabezado, se lo toma como nuevo). */
    static boolean frozen(JsonNode feed, Instant now) {
        long header = feed.path("Header").path("timestamp").asLong(0);
        return header > 0 && now.getEpochSecond() - header > STALE_FEED.toSeconds();
    }

    /**
     * Las lineas sin servicio confirmado (sin trenes desde hace CONFIRM o
     * mas), con su descripcion; el Premetro, si estan todas y la noticia
     * del paro lo incluye.
     */
    static List<Outage> outages(Map<String, Instant> emptySince, Instant now, Optional<NewsItem> strike) {
        Map<String, Instant> confirmed = new LinkedHashMap<>();
        for (String line : LINES) {
            Instant since = emptySince.get(line);
            if (since != null && !since.plus(CONFIRM).isAfter(now)) {
                confirmed.put(line, since);
            }
        }
        List<Outage> result = new ArrayList<>();
        confirmed.forEach((line, since) -> result.add(new Outage(line, TransportMode.SUBTE,
                description(strike.isPresent(), LocalDateTime.ofInstant(since, BUENOS_AIRES).format(HOUR)))));
        if (confirmed.size() == LINES.size() && strike.isPresent()
                && ALL_LINES.matcher(normalize(strike.get().title())).find()) {
            result.add(new Outage("P", TransportMode.PREMETRO,
                    "Sin servicio por paro, según las noticias de hoy."));
        }
        return result;
    }

    static String description(boolean strike, String since) {
        String noTrains = "el pronóstico en vivo no muestra trenes desde las " + since + ".";
        return strike
                ? "Sin servicio por paro, según las noticias de hoy. " + Character.toUpperCase(noTrains.charAt(0))
                        + noTrains.substring(1)
                : "Sin servicio: " + noTrains;
    }

    /** La noticia mas nueva de las ultimas horas que habla de un paro del subte. */
    static Optional<NewsItem> strikeNews(List<NewsItem> items, Instant now) {
        return items.stream()
                .filter(n -> n.publishedAt() != null && !n.publishedAt().isBefore(now.minus(NEWS_WINDOW))
                        && !n.publishedAt().isAfter(now.plus(Duration.ofMinutes(5))))
                .filter(n -> mentionsStrike(n.title()))
                .max(Comparator.comparing(NewsItem::publishedAt));
    }

    static boolean mentionsStrike(String title) {
        String text = normalize(title);
        return STRIKE.matcher(text).find() && SUBWAY.matcher(text).find();
    }

    /** Minusculas y sin tildes. */
    static String normalize(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    /** Un id por linea y por dia: un paro de otro dia es otra alerta. */
    static String externalId(String lineCode, LocalDate day) {
        return ID_PREFIX + lineCode + ":" + day;
    }

    void apply(List<Outage> outages, LocalDate day) {
        Set<String> current = new HashSet<>();
        for (Outage outage : outages) {
            TransportLine line = lineRepository.findByModeAndCodeIgnoreCase(outage.mode(), outage.lineCode())
                    .orElse(null);
            if (line == null) {
                continue;
            }
            String id = externalId(outage.lineCode(), day);
            current.add(id);
            Optional<Alert> existing = alertRepository.findByExternalId(id);
            if (existing.isPresent()) {
                Alert alert = existing.get();
                alert.setActive(true);
                if (!outage.description().equals(alert.getDescription())) {
                    alert.updateFromSource(AlertType.INTERRUPCION, outage.description(), null, null);
                }
            } else {
                alertRepository.save(new Alert(line, AlertType.INTERRUPCION, outage.description(), SOURCE_NAME, id,
                        null, null));
                log.info("Subte sin servicio: linea {} ({}).", outage.lineCode(), outage.description());
            }
        }
        alertRepository.findByActiveTrueAndExternalIdIsNotNull().stream()
                .filter(a -> SOURCE_NAME.equals(a.getSource()))
                .filter(a -> !current.contains(a.getExternalId()))
                .forEach(a -> {
                    a.setActive(false);
                    log.info("Subte sin servicio: se da de baja {}.", a.getExternalId());
                });
    }
}
