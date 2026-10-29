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

    public Instant getFavoritesUpdatedAt() {
        return favoritesUpdatedAt;
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
