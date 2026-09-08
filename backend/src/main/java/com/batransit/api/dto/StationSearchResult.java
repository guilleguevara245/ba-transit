package com.batransit.api.dto;

public record StationSearchResult(
        Long stationId,
        String stationName,
        Long lineId,
        String lineName,
        String lineColorHex,
        Integer sequenceOrder
) {
}
