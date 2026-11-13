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
 * linea sigue sin ningun tren durante CONFIRM (CONFIRM_WITH_NEWS si no anda
 * ninguna y hay una noticia de paro), se guarda una alerta
 * "Sin servicio" de la linea; cuando vuelven a aparecer trenes (o termina
 * el horario), se da de baja. Si una noticia reciente habla de un paro, se
 * dice el motivo; el Premetro (que no esta en el pronostico) se marca solo
 * si estan todas las lineas sin trenes y la noticia lo nombra o habla de
 * todas las lineas.
 *
 * Si el pronostico no responde o esta congelado, no cambia que lineas
 * estan sin trenes. Paro de toda la red: ver withNetworkStrike.
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
    /**
     * Con una noticia de paro y ninguna linea andando alcanza con menos: no
     * es un hueco de una linea sino toda la red.
     */
    static final Duration CONFIRM_WITH_NEWS = Duration.ofMinutes(3);
    /** Al abrir no se avisa hasta que pasen los primeros trenes (el primero sale un poco antes o despues). */
    static final int AFTER_FIRST_SECONDS = 20 * 60;
    /**
     * Hasta la ultima salida de la cabecera se avisa: los trenes que salen
     * a esa hora siguen andando un rato, asi que el pronostico no se vacia antes.
     */
    static final int BEFORE_LAST_SECONDS = 0;
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

    @Scheduled(initialDelay = 60_000L, fixedDelay = 60_000L)
    public void check() {
        Instant now = Instant.now();
        LocalDateTime local = LocalDateTime.ofInstant(now, BUENOS_AIRES);
        // Con el pronostico caido o congelado no se cambia que lineas estan sin trenes.
        Optional<Fetched> feed = client.get("/subtes/forecastGTFS", SubteArrivalsController.MAX_AGE);
        if (feed.isPresent() && frozen(feed.get().body(), now)) {
            log.warn("Subte sin servicio: el pronostico esta congelado; no se cambia que lineas estan sin trenes.");
        } else if (feed.isPresent()) {
            Set<String> running = SubteArrivals.linesWithTrains(feed.get().body(), now.getEpochSecond());
            for (String line : LINES) {
                boolean expected = schedule.inService(line, local, AFTER_FIRST_SECONDS, BEFORE_LAST_SECONDS);
                if (running.contains(line) || !expected) {
                    emptySince.remove(line);
                } else {
                    emptySince.putIfAbsent(line, now);
                }
            }
        }
        List<NewsItem> items = news.current() == null ? List.of() : news.current().items();
        Optional<NewsItem> strike = strikeNews(items, now);
        List<Outage> outages = outages(emptySince, now, strike);
        try {
            transactionTemplate.executeWithoutResult(s -> apply(outages, strike, now, local.toLocalDate()));
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
        boolean wholeNetwork = strike.isPresent() && LINES.stream().allMatch(emptySince::containsKey);
        Duration confirm = wholeNetwork ? CONFIRM_WITH_NEWS : CONFIRM;
        Map<String, Instant> confirmed = new LinkedHashMap<>();
        for (String line : LINES) {
            Instant since = emptySince.get(line);
            if (since != null && !since.plus(confirm).isAfter(now)) {
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

    /** Con cuantas lineas paradas por el paro se da por parada toda la red. */
    static final int NETWORK_MIN_LINES = 3;
    static final String NETWORK_TEXT = "Sin servicio por paro, según las noticias de hoy.";
    private static final Pattern UNTIL_MIDNIGHT = Pattern.compile("\\bhasta (la medianoche|las 24)\\b");
    private static final Pattern UNTIL_HOUR = Pattern.compile("\\bhasta las (\\d{1,2})(?:[:.](\\d{2}))?\\b");

    /**
     * Paro de toda la red: si la noticia del paro habla de todas las lineas
     * (o del Premetro) y ya hay al menos NETWORK_MIN_LINES lineas sin
     * servicio (por el pronostico o por los avisos de la Ciudad), se suman
     * las que faltan y el Premetro, hasta que termina el paro segun la
     * noticia. outByOthers: las lineas que ya tienen una interrupcion por
     * el paro de otra fuente (no se repiten).
     */
    static List<Outage> withNetworkStrike(List<Outage> outages, Set<String> outByOthers, Optional<NewsItem> strike,
                                          Instant now) {
        List<Outage> result = new ArrayList<>(outages.stream()
                .filter(o -> !outByOthers.contains(o.lineCode())).toList());
        if (strike.isEmpty() || !ALL_LINES.matcher(normalize(strike.get().title())).find()
                || !now.isBefore(strikeEnd(strike.get()))) {
            return result;
        }
        Set<String> out = new HashSet<>(outByOthers);
        outages.forEach(o -> out.add(o.lineCode()));
        if (LINES.stream().filter(out::contains).count() < NETWORK_MIN_LINES) {
            return result;
        }
        for (String line : LINES) {
            if (!out.contains(line)) {
                result.add(new Outage(line, TransportMode.SUBTE, NETWORK_TEXT));
            }
        }
        if (!out.contains("P")) {
            result.add(new Outage("P", TransportMode.PREMETRO, NETWORK_TEXT));
        }
        return result;
    }

    /**
     * Hasta cuando dura el paro segun el titulo de la noticia: "hasta la
     * medianoche", "hasta las 15"; si no lo dice, hasta la medianoche del
     * dia en que salio la noticia.
     */
    static Instant strikeEnd(NewsItem item) {
        LocalDateTime published = LocalDateTime.ofInstant(item.publishedAt(), BUENOS_AIRES);
        LocalDateTime midnight = published.toLocalDate().plusDays(1).atStartOfDay();
        String title = normalize(item.title());
        java.util.regex.Matcher hour = UNTIL_HOUR.matcher(title);
        LocalDateTime end = midnight;
        if (!UNTIL_MIDNIGHT.matcher(title).find() && hour.find()) {
            int h = Integer.parseInt(hour.group(1));
            int m = hour.group(2) == null ? 0 : Integer.parseInt(hour.group(2));
            if (h < 24 && m < 60) {
                end = published.toLocalDate().atTime(h, m);
                if (end.isBefore(published)) {
                    end = end.plusDays(1);
                }
            }
        }
        return end.atZone(BUENOS_AIRES).toInstant();
    }

    /** Si el texto de un aviso habla de un paro ("medida de fuerza gremial"). */
    static boolean mentionsStrikeText(String text) {
        return STRIKE.matcher(normalize(text)).find();
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

    void apply(List<Outage> forecastOutages, Optional<NewsItem> strike, Instant now, LocalDate day) {
        // Las lineas que la Ciudad (u otra fuente) ya da por interrumpidas por el paro.
        Map<Long, String> codeById = new java.util.HashMap<>();
        for (String code : LINES) {
            lineRepository.findByModeAndCodeIgnoreCase(TransportMode.SUBTE, code)
                    .ifPresent(l -> codeById.put(l.getId(), code));
        }
        Set<String> outByOthers = new HashSet<>();
        for (Alert alert : alertRepository.findByActiveTrueOrderByPublishedAtDesc()) {
            if (!SOURCE_NAME.equals(alert.getSource()) && alert.getType() == AlertType.INTERRUPCION
                    && mentionsStrikeText(alert.getDescription()) && codeById.containsKey(alert.transportLineId())) {
                outByOthers.add(codeById.get(alert.transportLineId()));
            }
        }
        List<Outage> outages = withNetworkStrike(forecastOutages, outByOthers, strike, now);
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
