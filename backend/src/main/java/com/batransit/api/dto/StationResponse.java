package com.batransit.api.dto;

import com.batransit.api.domain.Station;

import java.math.BigDecimal;

public record StationResponse(
        Long id,
        Long branchId,
        String name,
        Integer sequenceOrder,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean active
) {
    public static StationResponse from(Station station) {
        return new StationResponse(station.getId(), station.branchId(), station.getName(),
                station.getSequenceOrder(), station.getLatitude(), station.getLongitude(), station.isActive());
    }
}
