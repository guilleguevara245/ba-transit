package com.batransit.api.domain;

import com.batransit.api.exception.BadRequestException;
import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Modos de transporte soportados. Antes era un String libre en todo el
 * codigo, y un valor mal escrito ("subtee") pasaba sin error y devolvia
 * listas vacias. Se guarda en la base como texto (mismo VARCHAR de
 * siempre), asi que no requiere migracion.
 */
public enum TransportMode {
    SUBTE,
    TREN,
    PREMETRO,
    COLECTIVO,
    AEROPUERTO;

    /**
     * Convierte texto en modo, sin distinguir mayusculas ("subte",
     * "Subte" y "SUBTE" valen igual). Se usa tanto para parametros de
     * URL como para JSON (@JsonCreator). Un valor invalido es un 400
     * que lista los valores aceptados.
     */
    @JsonCreator
    public static TransportMode from(String value) {
        if (value != null) {
            String normalized = value.trim().toUpperCase(Locale.ROOT);
            for (TransportMode mode : values()) {
                if (mode.name().equals(normalized)) {
                    return mode;
                }
            }
        }
        String valid = Arrays.stream(values()).map(Enum::name).collect(Collectors.joining(", "));
        throw new BadRequestException("Modo de transporte invalido: '" + value + "'. Valores validos: " + valid);
    }
}
