package com.batransit.api.dto;

import java.math.BigDecimal;

public record MapStation(
        Long stationId,
        String stationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Long lineId,
        String lineCode,
        String lineName,
        String lineColorHex,
        Integer sequenceOrder
) {
}
