package com.batransit.api.dto;

public record LineAlertCountRow(
        Long lineId,
        String lineName,
        String lineColorHex,
        Long totalAlerts,
        Long activeAlerts
) {
}
