package com.batransit.api.dto;

import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;

public record LineResponse(
        Long id,
        TransportMode mode,
        String code,
        String name,
        String colorHex,
        boolean active
) {
    public static LineResponse from(TransportLine line) {
        return new LineResponse(line.getId(), line.getMode(), line.getCode(), line.getName(),
                line.getColorHex(), line.isActive());
    }
}
