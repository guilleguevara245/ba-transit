package com.batransit.api.dto;

import com.batransit.api.domain.AlertType;

public record LineTypeCountRow(
        Long lineId,
        AlertType type,
        Long count
) {
}
