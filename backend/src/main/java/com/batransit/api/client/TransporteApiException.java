package com.batransit.api.client;

/**
 * Error al consultar la API Transporte. A proposito no encadena la
 * excepcion original: su mensaje incluye la URL con el client_secret
 * (ver TransporteApiClient).
 */
public class TransporteApiException extends RuntimeException {

    public TransporteApiException(String message) {
        super(message);
    }
}
