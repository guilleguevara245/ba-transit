package com.batransit.api.eventos;

import com.batransit.api.exception.BadRequestException;
import com.batransit.api.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Eventos masivos y cortes de transito: cargados a mano (POST con la clave
 * de administrador, o en una migracion) a partir de anuncios oficiales, y
 * los cortes que publica la Ciudad en sus noticias (CityNoticesSyncService).
 *
 * La API Transporte tenia una ruta /transito/v1/eventos, pero en su
 * especificacion esta dada de baja y responde HTTP 500 (octubre de 2026).
 * El lector que la usaba esta en el historial de git (v16.4) por si hay
 * que recuperarlo.
 */
@Service
public class CityEventService {

    /** Como mucho se muestran estos (los mas proximos). */
    static final int MAX_EVENTS = 12;

    private final PublicEventRepository repository;

    public CityEventService(PublicEventRepository repository) {
        this.repository = repository;
    }

    /**
     * Los que no terminaron, del mas proximo al mas lejano. Si un corte
     * esta cargado a mano y tambien salio de las noticias (misma url), va
     * una sola vez: el cargado a mano, que tiene calles y horarios.
     */
    @Transactional(readOnly = true)
    public List<CityEvent> current() {
        Instant now = Instant.now();
        List<PublicEvent> events = repository.findCurrent(now);
        Set<String> manualUrls = events.stream()
                .filter(e -> PublicEvent.SOURCE_MANUAL.equals(e.getSource()) && e.getUrl() != null)
                .map(PublicEvent::getUrl)
                .collect(Collectors.toSet());
        return events.stream()
                .filter(e -> PublicEvent.SOURCE_MANUAL.equals(e.getSource()) || !manualUrls.contains(e.getUrl()))
                .map(CityEvent::from)
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
