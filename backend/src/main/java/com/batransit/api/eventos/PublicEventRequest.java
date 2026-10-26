package com.batransit.api.eventos;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Alta de un evento o corte. kind: EVENTO (default), MANIFESTACION, OBRA
 * o CORTE. Fechas con zona horaria, por ejemplo 2027-03-13T08:00:00-03:00.
 * latitude/longitude: punto del evento, para mostrarlo en las estaciones
 * cercanas.
 */
public record PublicEventRequest(
        @Pattern(regexp = "EVENTO|MANIFESTACION|OBRA|CORTE") String kind,
        @NotBlank @Size(max = 150) String title,
        @Size(max = 500) String description,
        @Size(max = 300) String streets,
        @NotNull OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        @DecimalMin("-56") @DecimalMax("-21") BigDecimal latitude,
        @DecimalMin("-74") @DecimalMax("-53") BigDecimal longitude,
        @Size(max = 300) String url,
        Boolean affectsAccesses
) {
}
