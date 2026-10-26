package com.batransit.api.eventos;

import com.batransit.api.exception.BadRequestException;
import com.batransit.api.exception.NotFoundException;
import com.batransit.api.live.TransporteLiveClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * Eventos masivos y cortes de transito: los que publica la API
 * Transporte (/transito/v1/eventos, mes actual y siguiente) mas los
 * cargados a mano. Los de la API se actualizan cada 15 minutos.
 */
@Service
public class CityEventService {

    private static final Logger log = LoggerFactory.getLogger(CityEventService.class);
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    /** Como mucho se muestran estos (los mas proximos). */
    static final int MAX_EVENTS = 12;

    private final PublicEventRepository repository;
    private final TransporteLiveClient client;
    private volatile List<CityEvent> fromApi = List.of();
    private volatile Instant apiUpdatedAt;
    private boolean loggedSample;

    public CityEventService(PublicEventRepository repository, TransporteLiveClient client) {
        this.repository = repository;
        this.client = client;
    }

    @Scheduled(initialDelay = 30_000, fixedDelay = 15 * 60 * 1000L)
    public void refresh() {
        if (!client.isConfigured()) {
            return;
        }
        try {
            Instant now = Instant.now();
            YearMonth month = YearMonth.now(BUENOS_AIRES);
            Map<String, CityEvent> events = new LinkedHashMap<>();
            boolean any = false;
            for (YearMonth m : List.of(month, month.plusMonths(1))) {
                var feed = client.get("/transito/v1/eventos?month=" + m + "&provider=1", Duration.ofMinutes(10));
                if (feed.isEmpty()) {
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
            }
        } catch (Exception e) {
            log.warn("No se pudieron actualizar los eventos de transito ({})", e.getClass().getSimpleName());
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
