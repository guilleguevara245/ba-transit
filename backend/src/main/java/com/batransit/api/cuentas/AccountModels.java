package com.batransit.api.cuentas;

import java.time.Instant;
import java.util.List;

/** Pedidos y respuestas de las cuentas. */
public final class AccountModels {

    private AccountModels() {
    }

    public record RegisterRequest(String email, String password, String name, String lastName) {
    }

    public record LoginRequest(String email, String password) {
    }

    /** credential: el ID token que devuelve el boton de Google. */
    public record GoogleRequest(String credential) {
    }

    /**
     * Favoritos: los mismos grupos que guarda el sitio en el navegador.
     * colectivos: el cartel de cada linea ("152", "53A").
     */
    public record Favorites(List<Long> lineas, List<Long> estaciones, List<String> accesos, List<String> colectivos) {
        public static Favorites empty() {
            return new Favorites(List.of(), List.of(), List.of(), List.of());
        }
    }

    /**
     * Un lugar guardado. tipo: 'casa' | 'trabajo' | 'otro'. Tiene una
     * estacion (id) o una direccion, no las dos. Una direccion confirmada
     * (con Georef) trae ademas su zona, lat y lon redondeados a la grilla
     * de 0,05 grados (unos 5 km, nunca el punto exacto), y cerca: la
     * estacion mas cercana.
     */
    public record SavedPlace(String tipo, String nombre, Long estacion, String direccion, Double lat, Double lon,
                             Long cerca) {

        public SavedPlace(String tipo, String nombre, Long estacion, String direccion) {
            this(tipo, nombre, estacion, direccion, null, null, null);
        }
    }

    /** Mis lugares: Casa, Trabajo y otros. */
    public record Places(List<SavedPlace> lugares) {
        public static Places empty() {
            return new Places(List.of());
        }
    }

    /**
     * La imagen de la cuenta. kind: 'avatar' | 'google' | 'foto' (null = la
     * inicial). value: el avatar elegido. url: la foto (de Google o propia,
     * esta ultima como data URL). googleAvailable: si hay foto de Google para elegir.
     */
    public record UserImage(String kind, String value, String url, boolean googleAvailable) {
    }

    /** hasPassword / hasGoogle: con que puede entrar. */
    /** name: el nombre (con el que se saluda); lastName: el apellido, o null. */
    public record UserView(long id, String email, String name, boolean hasPassword, boolean hasGoogle, Instant createdAt,
                           UserImage image, String lastName) {
    }

    /** Elegir la imagen: kind 'avatar' (con value), 'google' o null (la inicial). */
    public record ImageRequest(String kind, String value) {
    }

    /** Foto propia, ya recortada en el navegador: "data:image/jpeg;base64,...". */
    public record PhotoRequest(String dataUrl) {
    }

    public record SessionResponse(String token, UserView user) {
    }

    public record NameRequest(String name, String lastName) {
    }

    /** current: la contraseña actual (no hace falta si la cuenta todavia no tiene, por ejemplo solo Google). */
    public record PasswordRequest(String current, String password) {
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
