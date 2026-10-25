package com.batransit.api.exception;

/**
 * Datos de entrada validos en formato pero invalidos para el negocio
 * (ej. un tramo de tarifa con minKm mayor que maxKm). Se convierte en
 * un 400.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
