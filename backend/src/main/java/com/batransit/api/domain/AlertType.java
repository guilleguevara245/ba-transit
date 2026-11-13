package com.batransit.api.domain;

public enum AlertType {
    OBRA,
    DEMORA,
    INTERRUPCION,
    DESVIO,
    /**
     * Un aviso que no es un problema (horario extendido, servicio
     * adicional): se muestra y se notifica, pero la linea sigue normal.
     */
    AVISO
}
