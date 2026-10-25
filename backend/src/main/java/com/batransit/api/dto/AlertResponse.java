package com.batransit.api.dto;

import com.batransit.api.domain.Alert;
import com.batransit.api.domain.AlertType;

import java.time.Instant;

public record AlertResponse(
        Long id,
        Long transportLineId,
        AlertType type,
        String description,
        String source,
        boolean active,
        Instant publishedAt
) {
    public static AlertResponse from(Alert alert) {
        return new AlertResponse(alert.getId(), alert.transportLineId(), alert.getType(), alert.getDescription(),
                alert.getSource(), alert.isActive(), alert.getPublishedAt());
    }
}
