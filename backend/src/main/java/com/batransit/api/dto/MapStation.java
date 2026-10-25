package com.batransit.api.dto;

import com.batransit.api.domain.TransportMode;

import java.math.BigDecimal;

public record MapStation(
        Long stationId,
        String stationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Long branchId,
        Long lineId,
        TransportMode lineMode,
        String lineCode,
        String lineName,
        String lineColorHex,
        Integer sequenceOrder
) {
}
