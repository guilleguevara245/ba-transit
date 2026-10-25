package com.batransit.api.dto;

import com.batransit.api.domain.SpecialServiceKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Alta de un servicio especial o cambio en el servicio. kind vacio =
 * ESPECIAL; validUntil vacio = sin fecha de fin; url = aviso oficial.
 */
public record SpecialServiceRequest(
        @NotNull Long lineId,
        SpecialServiceKind kind,
        @NotBlank @Size(max = 120) String title,
        @Size(max = 500) String description,
        @Size(max = 60) String days,
        @Size(max = 160) String schedule,
        @NotNull LocalDate validFrom,
        LocalDate validUntil,
        @Size(max = 300) String url
) {
}
