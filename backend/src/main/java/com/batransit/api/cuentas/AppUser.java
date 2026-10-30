package com.batransit.api.cuentas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/** Una cuenta de usuario (tabla app_user, ver V43). */
@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Siempre en minusculas. */
    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "display_name", length = 80)
    private String displayName;

    /** Null si la cuenta solo entra con Google. */
    @Column(name = "password_hash", length = 200)
    private String passwordHash;

    /** Id de la cuenta de Google; null si nunca entro con Google. */
    @Column(name = "google_sub", length = 64)
    private String googleSub;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String favorites = "{}";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "favorites_updated_at")
    private Instant favoritesUpdatedAt;

    /** Tema y preferencias de avisos, en JSON (ver Preferences). */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String preferences = "{}";

    @Column(name = "preferences_updated_at")
    private Instant preferencesUpdatedAt;

    /** Mis lugares, en JSON ({"lugares":[...]}). */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String places = "{}";

    @Column(name = "places_updated_at")
    private Instant placesUpdatedAt;

    /** Imagen: 'avatar' | 'google' | 'foto' (null = la inicial). */
    @Column(name = "avatar_kind", length = 10)
    private String avatarKind;

    /** El avatar elegido ("subte-b", "colectivo"...). */
    @Column(name = "avatar_value", length = 40)
    private String avatarValue;

    @Column(name = "google_picture", length = 500)
    private String googlePicture;

    /** Foto propia: JPEG de 256 px recortado en el navegador. */
    @Column(name = "photo", columnDefinition = "bytea")
    private byte[] photo;

    @Column(name = "photo_type", length = 20)
    private String photoType;

    /** Las sesiones emitidas antes de esto ya no valen (se cambio la contrasena). */
    @Column(name = "sessions_valid_after")
    private Instant sessionsValidAfter;

    protected AppUser() {
        // Para JPA.
    }

    public AppUser(String email, String displayName) {
        this.email = email;
        this.displayName = displayName;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getGoogleSub() {
        return googleSub;
    }

    public void setGoogleSub(String googleSub) {
        this.googleSub = googleSub;
    }

    public String getFavorites() {
        return favorites;
    }

    public void setFavorites(String favorites, Instant at) {
        this.favorites = favorites;
        this.favoritesUpdatedAt = at;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public String getPreferences() {
        return preferences;
    }

    public void setPreferences(String preferences, Instant at) {
        this.preferences = preferences;
        this.preferencesUpdatedAt = at;
    }

    public Instant getPreferencesUpdatedAt() {
        return preferencesUpdatedAt;
    }

    public String getPlaces() {
        return places;
    }

    public void setPlaces(String places, Instant at) {
        this.places = places;
        this.placesUpdatedAt = at;
    }

    public Instant getPlacesUpdatedAt() {
        return placesUpdatedAt;
    }

    public Instant getFavoritesUpdatedAt() {
        return favoritesUpdatedAt;
    }

    public String getAvatarKind() {
        return avatarKind;
    }

    public String getAvatarValue() {
        return avatarValue;
    }

    public String getGooglePicture() {
        return googlePicture;
    }

    public byte[] getPhoto() {
        return photo;
    }

    public String getPhotoType() {
        return photoType;
    }

    public void setAvatar(String kind, String value) {
        this.avatarKind = kind;
        this.avatarValue = value;
    }

    public void setGooglePicture(String googlePicture) {
        this.googlePicture = googlePicture;
    }

    public void setPhoto(byte[] photo, String type) {
        this.photo = photo;
        this.photoType = type;
    }

    public Instant getSessionsValidAfter() {
        return sessionsValidAfter;
    }

    public void setSessionsValidAfter(Instant sessionsValidAfter) {
        this.sessionsValidAfter = sessionsValidAfter;
    }

    /** Para los tests (sin base de datos). */
    void setIdForTests(Long id) {
        this.id = id;
    }
}
