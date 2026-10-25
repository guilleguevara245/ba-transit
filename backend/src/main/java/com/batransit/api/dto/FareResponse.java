package com.batransit.api.dto;

import com.batransit.api.domain.Fare;
import com.batransit.api.domain.TransportMode;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FareResponse(
        Long id,
        TransportMode mode,
        BigDecimal minKm,
        BigDecimal maxKm,
        BigDecimal price,
        LocalDate effectiveFrom
) {
    public static FareResponse from(Fare fare) {
        return new FareResponse(fare.getId(), fare.getMode(), fare.getMinKm(), fare.getMaxKm(),
                fare.getPrice(), fare.getEffectiveFrom());
    }
}
