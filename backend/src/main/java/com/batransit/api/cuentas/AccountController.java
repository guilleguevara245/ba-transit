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
    private final AccountDataExport export;

    public AccountController(AccountService service, TokenService tokens, GoogleTokenVerifier google,
                             LoginRateLimiter limiter, PasswordResetService resets, AccountDataExport export) {
        this.export = export;
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

    @GetMapping("/api/v1/cuenta/lugares")
    public AccountModels.Places places(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return service.places(userId(authorization));
    }

    /** Guarda Mis lugares (reemplaza la lista entera). */
    @PutMapping("/api/v1/cuenta/lugares")
    public AccountModels.Places savePlaces(@RequestHeader(name = "Authorization", required = false) String authorization,
                                           @RequestBody AccountModels.Places body) {
        return service.savePlaces(userId(authorization), body);
    }

    @PutMapping("/api/v1/cuenta/nombre")
    public UserView rename(@RequestHeader(name = "Authorization", required = false) String authorization,
                           @RequestBody AccountModels.NameRequest body) {
        return service.rename(userId(authorization), body.name());
    }

    /** Agrega o cambia la contraseña; cierra las otras sesiones y devuelve una nueva. */
    @PutMapping("/api/v1/cuenta/contrasena")
    public SessionResponse changePassword(@RequestHeader(name = "Authorization", required = false) String authorization,
                                          @RequestBody AccountModels.PasswordRequest body) {
        TokenService.Claims claims = userId(authorization);
        limit("contrasena:" + claims.userId());
        return service.changePassword(claims, body.current(), body.password());
    }

    /** Los dispositivos con la cuenta abierta. */
    @GetMapping("/api/v1/cuenta/dispositivos")
    public java.util.List<AccountService.DeviceView> devices(
            @RequestHeader(name = "Authorization", required = false) String authorization) {
        return service.devices(userId(authorization));
    }

    /** Cierra la sesion de otro dispositivo. */
    @DeleteMapping("/api/v1/cuenta/dispositivos/{id}")
    public ResponseEntity<Void> closeDevice(@RequestHeader(name = "Authorization", required = false) String authorization,
                                            @org.springframework.web.bind.annotation.PathVariable String id) {
        service.closeDevice(userId(authorization), id);
        return ResponseEntity.noContent().build();
    }

    /** Cierra la sesion de este dispositivo (si el token ya no vale, igual responde bien). */
    @DeleteMapping("/api/v1/cuenta/sesion")
    public ResponseEntity<Void> logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
        tokens.fromHeader(authorization).ifPresent(service::logout);
        return ResponseEntity.noContent().build();
    }

    /** Cierra la sesion en todos los demas dispositivos. */
    @PostMapping("/api/v1/cuenta/cerrar-sesiones")
    public SessionResponse closeOtherSessions(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return service.closeOtherSessions(userId(authorization));
    }

    @GetMapping("/api/v1/cuenta/preferencias")
    public Preferences.Prefs preferences(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return service.preferences(userId(authorization));
    }

    @PutMapping("/api/v1/cuenta/preferencias")
    public Preferences.Prefs savePreferences(@RequestHeader(name = "Authorization", required = false) String authorization,
                                             @RequestBody Preferences.Prefs body) {
        return service.savePreferences(userId(authorization), body);
    }

    /** Todo lo guardado de la cuenta, en JSON para descargar. */
    @GetMapping("/api/v1/cuenta/datos")
    public ResponseEntity<java.util.Map<String, Object>> data(
            @RequestHeader(name = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"ba-transit-mis-datos.json\"")
                .body(export.export(userId(authorization)));
    }

    /** Elige la imagen de la cuenta: un avatar, la foto de Google o la inicial. */
    @PutMapping("/api/v1/cuenta/imagen")
    public UserView setImage(@RequestHeader(name = "Authorization", required = false) String authorization,
                             @RequestBody AccountModels.ImageRequest body) {
        return service.setImage(userId(authorization), body.kind(), body.value());
    }

    /** Sube la foto propia (ya recortada en el navegador). */
    @PutMapping("/api/v1/cuenta/foto")
    public UserView setPhoto(@RequestHeader(name = "Authorization", required = false) String authorization,
                             @RequestBody AccountModels.PhotoRequest body) {
        return service.setPhoto(userId(authorization), body.dataUrl());
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
