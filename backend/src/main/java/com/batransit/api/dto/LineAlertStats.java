package com.batransit.api.dto;

public record LineAlertStats(
        Long lineId,
        String lineName,
        String lineColorHex,
        Long totalAlerts,
        Long activeAlerts,
        String mostCommonType
) {
}
