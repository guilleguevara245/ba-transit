package com.batransit.api.cuentas;

import java.time.Instant;
import java.util.List;

/** Pedidos y respuestas de las cuentas. */
public final class AccountModels {

    private AccountModels() {
    }

    public record RegisterRequest(String email, String password, String name) {
    }

    public record LoginRequest(String email, String password) {
    }

    /** credential: el ID token que devuelve el boton de Google. */
    public record GoogleRequest(String credential) {
    }

    /** Favoritos: los mismos tres grupos que guarda el sitio en el navegador. */
    public record Favorites(List<Long> lineas, List<Long> estaciones, List<String> accesos) {
        public static Favorites empty() {
            return new Favorites(List.of(), List.of(), List.of());
        }
    }

    /** hasPassword / hasGoogle: con que puede entrar. */
    public record UserView(long id, String email, String name, boolean hasPassword, boolean hasGoogle, Instant createdAt) {
    }

    public record SessionResponse(String token, UserView user) {
    }

    /** Para que el sitio sepa si mostrar "Continuar con Google" y "¿Olvidaste tu contraseña?". */
    public record AuthConfig(String googleClientId, boolean passwordReset) {
    }

    public record ResetRequest(String email) {
    }

    /** code: el codigo del link que llego por mail. */
    public record ResetConfirm(String code, String password) {
    }
}
