package com.batransit.api.dto;

import com.batransit.api.domain.TransportMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Datos para crear una tarifa. Los limites de @Digits coinciden con las
 * columnas de la tabla fare (NUMERIC(6,2) para km y NUMERIC(10,2) para
 * el precio), asi un valor fuera de rango es un 400 claro y no un error
 * de base de datos. La coherencia entre minKm y maxKm se valida en
 * FareService.
 */
public record FareRequest(
        @NotNull TransportMode mode,
        @PositiveOrZero @Digits(integer = 4, fraction = 2) BigDecimal minKm,
        @PositiveOrZero @Digits(integer = 4, fraction = 2) BigDecimal maxKm,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 8, fraction = 2) BigDecimal price,
        @NotNull LocalDate effectiveFrom
) {
}
