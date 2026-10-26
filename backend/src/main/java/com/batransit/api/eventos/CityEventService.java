package com.batransit.api.eventos;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.exception.BadRequestException;
import com.batransit.api.exception.NotFoundException;
import com.batransit.api.live.TransporteLiveClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Eventos masivos y cortes de transito cargados a mano.
 *
 * La API Transporte tenia una ruta /transito/v1/eventos, pero no figura en
 * su documentacion (en /transito/v1 solo estan estacionamientos y
 * semaforos) y responde siempre HTTP 500. Queda apagada por defecto; se
 * puede volver a probar con app.eventos.api-enabled=true (variable
 * EVENTOS_API_ENABLED) sin cambiar codigo.
 */
@Service
public class CityEventService {

    private static final Logger log = LoggerFactory.getLogger(CityEventService.class);

    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
        if (!apiEnabled) {
            health.disable(SourceHealth.Source.EVENTOS);
        }
    }
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    /** Como mucho se muestran estos (los mas proximos). */
    static final int MAX_EVENTS = 12;

    private final PublicEventRepository repository;
    private final TransporteLiveClient client;
    private volatile List<CityEvent> fromApi = List.of();
    private volatile Instant apiUpdatedAt;
    private boolean loggedSample;

    private final boolean apiEnabled;

    @Autowired
    public CityEventService(PublicEventRepository repository, TransporteLiveClient client,
                            @org.springframework.beans.factory.annotation.Value("${app.eventos.api-enabled:false}")
                            boolean apiEnabled) {
        this.repository = repository;
        this.client = client;
        this.apiEnabled = apiEnabled;
    }

    /** Cada cuanto se actualiza si todo anda, y cuanto se espera para reintentar si fallo. */
    private static final Duration REFRESH_EVERY = Duration.ofMinutes(15);
    private static final Duration RETRY_AFTER = Duration.ofMinutes(2);
    private volatile Instant nextRefresh = Instant.EPOCH;
    private int failures;

    /**
     * Se revisa cada minuto, pero solo se consulta cuando toca: cada 15
     * minutos, o a los 2 si la consulta anterior fallo (la API a veces no
     * responde, sobre todo justo despues de un reinicio).
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    public void tick() {
        if (!apiEnabled || Instant.now().isBefore(nextRefresh)) {
            return;
        }
        if (refresh()) {
            failures = 0;
            nextRefresh = Instant.now().plus(REFRESH_EVERY);
        } else {
            // 2, 4, 8 y despues 15 minutos: si la API sigue caida no se la consulta de mas.
            Duration wait = RETRY_AFTER.multipliedBy(1L << Math.min(failures, 3));
            failures++;
            nextRefresh = Instant.now().plus(wait.compareTo(REFRESH_EVERY) > 0 ? REFRESH_EVERY : wait);
        }
    }

    /** true si la API respondio. */
    public boolean refresh() {
        if (!client.isConfigured()) {
            return true;
        }
        try {
            Instant now = Instant.now();
            YearMonth month = YearMonth.now(BUENOS_AIRES);
            Map<String, CityEvent> events = new LinkedHashMap<>();
            boolean any = false;
            String failure = null;
            for (YearMonth m : List.of(month, month.plusMonths(1))) {
                String path = "/transito/v1/eventos?month=" + m + "&provider=1";
                var feed = client.get(path, Duration.ofMinutes(10));
                if (feed.isEmpty()) {
                    failure = client.lastError(path);
                    continue;
                }
                any = true;
                JsonNode body = feed.get().body();
                logSampleOnce(body);
                for (CityEvent e : TransitEventParser.parse(body, now)) {
                    events.putIfAbsent(e.id(), e);
                }
            }
            if (any) {
                fromApi = List.copyOf(events.values());
                apiUpdatedAt = now;
                log.info("Eventos API Transporte: {} relevantes", fromApi.size());
                health.ok(SourceHealth.Source.EVENTOS);
                return true;
            }
            health.fail(SourceHealth.Source.EVENTOS, failure != null ? failure : "sin respuesta");
            log.warn("Eventos API Transporte: sin datos ({})", failure != null ? failure : "sin respuesta");
            return false;
        } catch (Exception e) {
            health.fail(SourceHealth.Source.EVENTOS, e.getClass().getSimpleName());
            log.warn("No se pudieron actualizar los eventos de transito ({})", e.getClass().getSimpleName());
            return false;
        }
    }

    /**
     * La primera vez deja en el log los campos de un evento, para revisar
     * el formato del feed sin exponer credenciales.
     */
    private void logSampleOnce(JsonNode body) {
        if (loggedSample || body == null) {
            return;
        }
        JsonNode list = body.isArray() ? body : body.path("list");
        if (list.size() == 0) {
            return;
        }
        List<String> fields = new ArrayList<>();
        Iterator<String> names = list.get(0).fieldNames();
        names.forEachRemaining(fields::add);
        log.info("Eventos API Transporte: {} en el mes; campos: {}; ejemplo type={} impact={} name={}",
                list.size(), fields, list.get(0).path("type").asText(""), list.get(0).path("impact").asText(""),
                list.get(0).path("name").asText(""));
        loggedSample = true;
    }

    public Instant apiUpdatedAt() {
        return apiUpdatedAt;
    }

    /** Manuales y de la API que no terminaron, del mas proximo al mas lejano. */
    @Transactional(readOnly = true)
    public List<CityEvent> current() {
        Instant now = Instant.now();
        List<CityEvent> all = new ArrayList<>();
        repository.findCurrent(now).stream().map(CityEvent::from).forEach(all::add);
        fromApi.stream()
                .filter(e -> e.endsAt() == null || e.endsAt().isAfter(now))
                .forEach(all::add);
        return all.stream()
                .sorted(Comparator.comparing((CityEvent e) -> e.startsAt() == null ? now : e.startsAt()))
                .limit(MAX_EVENTS)
                .toList();
    }

    @Transactional
    public CityEvent create(PublicEventRequest request) {
        if (request.endsAt() != null && !request.endsAt().isAfter(request.startsAt())) {
            throw new BadRequestException("endsAt tiene que ser posterior a startsAt.");
        }
        if ((request.latitude() == null) != (request.longitude() == null)) {
            throw new BadRequestException("latitude y longitude van juntas.");
        }
        PublicEvent saved = repository.save(new PublicEvent(
                request.kind() == null ? "EVENTO" : request.kind(), request.title().trim(),
                blankToNull(request.description()), blankToNull(request.streets()),
                request.startsAt().toInstant(), request.endsAt() == null ? null : request.endsAt().toInstant(),
                request.latitude(), request.longitude(), blankToNull(request.url()),
                Boolean.TRUE.equals(request.affectsAccesses())));
        return CityEvent.from(saved);
    }

    /** Lo da de baja (no lo borra). */
    @Transactional
    public void deactivate(Long id) {
        PublicEvent event = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("No existe el evento " + id));
        event.deactivate();
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
