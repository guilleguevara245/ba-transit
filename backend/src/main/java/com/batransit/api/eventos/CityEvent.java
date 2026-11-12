package com.batransit.api.eventos;

import java.time.Instant;
import java.util.Locale;

/**
 * Evento o corte para mostrar: cargado a mano (source MANUAL) o leido de
 * las noticias de la Ciudad (source CIUDAD: startsAt es cuando se publico
 * y url, la noticia). kind: EVENTO, MANIFESTACION, OBRA o CORTE. impact:
 * ALTO (corte total o severo) o BAJO.
 */
public record CityEvent(String id, String source, String kind, String title, String description, String streets,
                        Instant startsAt, Instant endsAt, Double latitude, Double longitude, String impact,
                        String url, boolean affectsAccesses) {

    static CityEvent from(PublicEvent e) {
        return new CityEvent(e.getSource().toLowerCase(Locale.ROOT) + "-" + e.getId(), e.getSource(), e.getKind(), e.getTitle(), e.getDescription(),
                e.getStreets(), e.getStartsAt(), e.getEndsAt(),
                e.getLatitude() == null ? null : e.getLatitude().doubleValue(),
                e.getLongitude() == null ? null : e.getLongitude().doubleValue(),
                "ALTO", e.getUrl(), e.isAffectsAccesses());
    }
}
