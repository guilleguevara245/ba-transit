package com.batransit.api.dto;

import com.batransit.api.domain.Alert;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.Branch;

import java.time.Instant;

/**
 * Una alerta para mostrar. branchId y branchName: el ramal al que se
 * refiere, si es de uno solo (null: toda la linea).
 */
public record AlertResponse(
        Long id,
        Long transportLineId,
        AlertType type,
        String description,
        String source,
        boolean active,
        Instant publishedAt,
        Long branchId,
        String branchName
) {
    public AlertResponse(Long id, Long transportLineId, AlertType type, String description, String source,
                         boolean active, Instant publishedAt) {
        this(id, transportLineId, type, description, source, active, publishedAt, null, null);
    }

    public static AlertResponse from(Alert alert) {
        Branch branch = alert.getBranch();
        return new AlertResponse(alert.getId(), alert.transportLineId(), alert.getType(), alert.getDescription(),
                alert.getSource(), alert.isActive(), alert.getPublishedAt(),
                branch == null ? null : branch.getId(), branch == null ? null : branch.getName());
    }
}
