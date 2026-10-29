package com.batransit.api.cuentas;

import org.springframework.http.HttpStatus;

/** Error de las cuentas con su codigo HTTP y un mensaje para mostrar tal cual en el sitio. */
public class AccountException extends RuntimeException {

    private final HttpStatus status;

    public AccountException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }

    static AccountException unauthorized() {
        return new AccountException(HttpStatus.UNAUTHORIZED, "Tu sesión venció o no es válida: volvé a ingresar.");
    }
}
