package com.batransit.api.dto;

import com.batransit.api.domain.SpecialService;
import com.batransit.api.domain.SpecialServiceKind;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;

import java.time.LocalDate;

public record SpecialServiceResponse(
        Long id,
        Long lineId,
        TransportMode lineMode,
        String lineCode,
        String lineName,
        String lineColorHex,
        SpecialServiceKind kind,
        String title,
        String description,
        String days,
        String schedule,
        LocalDate validFrom,
        LocalDate validUntil,
        String url
) {
    public static SpecialServiceResponse from(SpecialService s) {
        TransportLine line = s.getTransportLine();
        return new SpecialServiceResponse(s.getId(), line.getId(), line.getMode(), line.getCode(), line.getName(),
                line.getColorHex(), s.getKind(), s.getTitle(), s.getDescription(), s.getDays(), s.getSchedule(),
                s.getValidFrom(), s.getValidUntil(), s.getUrl());
    }
}
