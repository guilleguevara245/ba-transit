package com.batransit.api.exception;

/**
 * Se lanza cuando se pide un recurso que no existe (una linea, un
 * ramal, etc.). GlobalExceptionHandler la convierte en un 404.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
