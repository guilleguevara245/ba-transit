package com.batransit.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FareRequest(
        @NotBlank String mode,
        BigDecimal minKm,
        BigDecimal maxKm,
        @NotNull BigDecimal price,
        @NotNull LocalDate effectiveFrom
) {
}
