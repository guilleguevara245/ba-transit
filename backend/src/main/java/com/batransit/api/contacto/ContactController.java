package com.batransit.api.contacto;

import com.batransit.api.contacto.ContactService.Account;
import com.batransit.api.contacto.ContactService.ContactMessage;
import com.batransit.api.contacto.ContactService.ContactRequest;
import com.batransit.api.cuentas.AccountException;
import com.batransit.api.cuentas.AccountModels.UserView;
import com.batransit.api.cuentas.AccountService;
import com.batransit.api.cuentas.TokenService;
import com.batransit.api.security.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.function.Function;

/** Formulario de contacto del sitio (pagina /contacto). */
@RestController
public class ContactController {

    private final ContactService service;
    private final ContactRateLimiter limiter;
    /** De la sesion (header Authorization) a la cuenta; null si no hay sesion o no vale. */
    private final Function<String, Account> accounts;

    @Autowired
    public ContactController(ContactService service, ContactRateLimiter limiter, TokenService tokens,
                             AccountService accountService) {
        this(service, limiter, authorization -> tokens.fromHeader(authorization).map(session -> {
            try {
                return account(accountService.me(session));
            } catch (AccountException e) {
                return null; // sesion vencida o cerrada: se manda como si no hubiera ingresado
            }
        }).orElse(null));
    }

    ContactController(ContactService service, ContactRateLimiter limiter, Function<String, Account> accounts) {
        this.service = service;
        this.limiter = limiter;
        this.accounts = accounts;
    }

    private static Account account(UserView user) {
        return new Account(user.id(), user.email(), user.name(), user.lastName(), user.createdAt());
    }

    /** GET /api/v1/contacto: si el formulario esta disponible (hay Brevo y CONTACT_EMAIL). */
    @GetMapping("/api/v1/contacto")
    public Map<String, Boolean> status() {
        return Map.of("available", service.isAvailable());
    }

    /**
     * POST /api/v1/contacto: manda el mensaje por mail. Con la sesion
     * iniciada (header Authorization, opcional) van tambien los datos de la
     * cuenta. 204 si salio; 400 si falta algo (con el motivo); 429 si la misma
     * IP mando demasiados o se llego al tope del dia; 503 si el formulario no
     * esta disponible o el mail no salio.
     */
    @PostMapping("/api/v1/contacto")
    public ResponseEntity<Void> send(@RequestBody(required = false) ContactRequest body, HttpServletRequest request,
                                     @RequestHeader(name = "Authorization", required = false) String authorization) {
        if (!service.isAvailable()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El formulario de contacto no está disponible por el momento.");
        }
        if (ContactService.isBot(body)) {
            return ResponseEntity.noContent().build();
        }
        ContactMessage message = ContactService.validate(body);
        switch (limiter.tryAcquire(ClientIp.of(request))) {
            case TOO_MANY_FROM_IP -> throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Ya mandaste varios mensajes seguidos. Probá de nuevo en un rato.");
            case TOO_MANY_TODAY -> throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Hoy llegaron muchos mensajes. Probá de nuevo mañana.");
            case OK -> {
            }
        }
        Account account = authorization == null || authorization.isBlank() ? null : accounts.apply(authorization);
        if (!service.send(message, request.getHeader(HttpHeaders.USER_AGENT), account)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo mandar el mensaje. Probá de nuevo en un rato.");
        }
        return ResponseEntity.noContent().build();
    }
}
