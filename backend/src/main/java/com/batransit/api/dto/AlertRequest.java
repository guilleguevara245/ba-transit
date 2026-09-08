package com.batransit.api.dto;

import com.batransit.api.domain.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Un "record" es una clase de Java pensada justo para esto: un
 * contenedor de datos inmutable, sin logica propia. Java genera solo
 * el constructor, los getters (con el mismo nombre del campo, sin
 * "get") y equals/hashCode. Menos codigo repetido que una clase
 * tradicional para algo que solo transporta datos de entrada.
 */
public record AlertRequest(
        @NotNull Long lineId,
        @NotNull AlertType type,
        @NotBlank String description,
        String source
) {
}
