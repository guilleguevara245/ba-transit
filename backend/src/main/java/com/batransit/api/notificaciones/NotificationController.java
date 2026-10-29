package com.batransit.api.notificaciones;

import com.batransit.api.cuentas.AccountException;
import com.batransit.api.cuentas.LoginRateLimiter;
import com.batransit.api.cuentas.TokenService;
import com.batransit.api.notificaciones.NotificationModels.EndpointRequest;
import com.batransit.api.notificaciones.NotificationModels.PublicKey;
import com.batransit.api.notificaciones.NotificationModels.SubscribeRequest;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Avisos (Web Push). No hace falta cuenta: la suscripcion la identifica su
 * endpoint, que solo conoce el navegador que la creo. Con sesion, ademas
 * queda asociada a la cuenta.
 */
@RestController
public class NotificationController {

    private final NotificationService service;
    private final VapidKeys keys;
    private final TokenService tokens;
    private final LoginRateLimiter limiter;

    public NotificationController(NotificationService service, VapidKeys keys, TokenService tokens, LoginRateLimiter limiter) {
        this.service = service;
        this.keys = keys;
        this.tokens = tokens;
        this.limiter = limiter;
    }

    /** Clave publica VAPID: el navegador la necesita para suscribirse. */
    @GetMapping("/api/v1/notificaciones/clave")
    public PublicKey publicKey() {
        return new PublicKey(keys.publicKeyBase64());
    }

    /** Activa o actualiza los avisos de este navegador (favoritos y preferencias). */
    @PutMapping("/api/v1/notificaciones/suscripcion")
    public ResponseEntity<Void> subscribe(@RequestBody SubscribeRequest body,
                                          @RequestHeader(name = "Authorization", required = false) String authorization) {
        Long userId = tokens.fromHeader(authorization).map(TokenService.Claims::userId).orElse(null);
        service.subscribe(body, userId);
        return ResponseEntity.noContent().build();
    }

    /** Apaga los avisos de este navegador. POST con el endpoint (DELETE con cuerpo no siempre pasa por proxies). */
    @PostMapping("/api/v1/notificaciones/baja")
    public ResponseEntity<Void> unsubscribe(@RequestBody EndpointRequest body) {
        service.unsubscribe(body.endpoint());
        return ResponseEntity.noContent().build();
    }

    /** Manda un aviso de prueba a este navegador. */
    @PostMapping("/api/v1/notificaciones/prueba")
    public ResponseEntity<Void> test(@RequestBody EndpointRequest body, HttpServletRequest request) {
        limit("prueba:" + clientIp(request));
        service.sendTest(body.endpoint());
        return ResponseEntity.noContent().build();
    }

    private void limit(String key) {
        if (!limiter.tryAcquire(key)) {
            throw new AccountException(HttpStatus.TOO_MANY_REQUESTS, "Demasiados pedidos seguidos. Esperá unos minutos.");
        }
    }

    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].strip() : request.getRemoteAddr();
    }
}
