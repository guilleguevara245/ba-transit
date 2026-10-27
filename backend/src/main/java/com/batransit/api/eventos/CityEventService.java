package com.batransit.api.eventos;

import com.batransit.api.exception.BadRequestException;
import com.batransit.api.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Eventos masivos y cortes de transito, cargados a mano (POST con la clave
 * de administrador) a partir de anuncios oficiales.
 *
 * La API Transporte tenia una ruta /transito/v1/eventos, pero en su
 * especificacion esta dada de baja y responde HTTP 500 (octubre de 2026).
 * La prueba semanal de CityApiProbe avisa si vuelve; el lector que la usaba
 * esta en el historial de git (v16.4) por si hay que recuperarlo.
 */
@Service
public class CityEventService {

    /** Como mucho se muestran estos (los mas proximos). */
    static final int MAX_EVENTS = 12;

    private final PublicEventRepository repository;

    public CityEventService(PublicEventRepository repository) {
        this.repository = repository;
    }

    /** Los que no terminaron, del mas proximo al mas lejano. */
    @Transactional(readOnly = true)
    public List<CityEvent> current() {
        Instant now = Instant.now();
        return repository.findCurrent(now).stream()
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
