package com.batransit.api.eventos;

import java.time.Instant;

/**
 * Evento o corte para mostrar, venga de la API Transporte (source API) o
 * de la carga manual (source MANUAL). kind: EVENTO, MANIFESTACION, OBRA o
 * CORTE. impact: ALTO (corte total o severo) o BAJO.
 */
public record CityEvent(String id, String source, String kind, String title, String description, String streets,
                        Instant startsAt, Instant endsAt, Double latitude, Double longitude, String impact,
                        String url, boolean affectsAccesses) {

    static CityEvent from(PublicEvent e) {
        return new CityEvent("manual-" + e.getId(), "MANUAL", e.getKind(), e.getTitle(), e.getDescription(),
                e.getStreets(), e.getStartsAt(), e.getEndsAt(),
                e.getLatitude() == null ? null : e.getLatitude().doubleValue(),
                e.getLongitude() == null ? null : e.getLongitude().doubleValue(),
                "ALTO", e.getUrl(), e.isAffectsAccesses());
    }
}
