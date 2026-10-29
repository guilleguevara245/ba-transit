package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.AuthConfig;
import com.batransit.api.cuentas.AccountModels.Favorites;
import com.batransit.api.cuentas.AccountModels.GoogleRequest;
import com.batransit.api.cuentas.AccountModels.LoginRequest;
import com.batransit.api.cuentas.AccountModels.RegisterRequest;
import com.batransit.api.cuentas.AccountModels.ResetConfirm;
import com.batransit.api.cuentas.AccountModels.ResetRequest;
import com.batransit.api.cuentas.AccountModels.SessionResponse;
import com.batransit.api.cuentas.AccountModels.UserView;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cuentas de usuario. Ingreso: /api/v1/auth/... (sin sesion). Con sesion
 * (header "Authorization: Bearer <token>"): /api/v1/cuenta/...
 */
@RestController
public class AccountController {

    private final AccountService service;
    private final TokenService tokens;
    private final GoogleTokenVerifier google;
    private final LoginRateLimiter limiter;
    private final PasswordResetService resets;

    public AccountController(AccountService service, TokenService tokens, GoogleTokenVerifier google,
                             LoginRateLimiter limiter, PasswordResetService resets) {
        this.service = service;
        this.tokens = tokens;
        this.google = google;
        this.limiter = limiter;
        this.resets = resets;
    }

    @GetMapping("/api/v1/auth/config")
    public AuthConfig config() {
        return new AuthConfig(google.isConfigured() ? google.clientId() : null, resets.isAvailable());
    }

    /** Pide el mail para recuperar la contrasena. Responde lo mismo haya o no cuenta. */
    @PostMapping("/api/v1/auth/recuperar")
    public ResponseEntity<Void> requestReset(@RequestBody ResetRequest body, HttpServletRequest request) {
        limit("recuperar:" + clientIp(request));
        resets.request(body.email());
        return ResponseEntity.accepted().build();
    }

    /** Pone la contrasena nueva con el codigo del link y deja la sesion iniciada. */
    @PostMapping("/api/v1/auth/restablecer")
    public SessionResponse reset(@RequestBody ResetConfirm body, HttpServletRequest request) {
        limit("restablecer:" + clientIp(request));
        return resets.reset(body.code(), body.password());
    }

    @PostMapping("/api/v1/auth/registro")
    public ResponseEntity<SessionResponse> register(@RequestBody RegisterRequest body, HttpServletRequest request) {
        limit("registro:" + clientIp(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(service.register(body.email(), body.password(), body.name()));
    }

    @PostMapping("/api/v1/auth/ingreso")
    public SessionResponse login(@RequestBody LoginRequest body, HttpServletRequest request) {
        limit("ip:" + clientIp(request));
        limit("mail:" + (body.email() == null ? "" : body.email().strip().toLowerCase(java.util.Locale.ROOT)));
        return service.login(body.email(), body.password());
    }

    @PostMapping("/api/v1/auth/google")
    public SessionResponse google(@RequestBody GoogleRequest body, HttpServletRequest request) {
        limit("google:" + clientIp(request));
        return service.loginWithGoogle(body.credential());
    }

    @GetMapping("/api/v1/cuenta")
    public UserView me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return service.me(userId(authorization));
    }

    @GetMapping("/api/v1/cuenta/favoritos")
    public Favorites favorites(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return service.favorites(userId(authorization));
    }

    @PutMapping("/api/v1/cuenta/favoritos")
    public Favorites saveFavorites(@RequestHeader(name = "Authorization", required = false) String authorization,
                                   @RequestBody Favorites body) {
        return service.saveFavorites(userId(authorization), body);
    }

    /** Borra la cuenta y sus favoritos (derecho de supresion). */
    @DeleteMapping("/api/v1/cuenta")
    public ResponseEntity<Void> delete(@RequestHeader(name = "Authorization", required = false) String authorization) {
        service.delete(userId(authorization));
        return ResponseEntity.noContent().build();
    }

    private TokenService.Claims userId(String authorization) {
        return tokens.fromHeader(authorization).orElseThrow(AccountException::unauthorized);
    }

    private void limit(String key) {
        if (!limiter.tryAcquire(key)) {
            throw new AccountException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.");
        }
    }

    /** Render pone la IP real del visitante primera en X-Forwarded-For. */
    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }
}
