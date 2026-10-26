package com.batransit.api.eventos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/** Evento masivo o corte cargado a mano (ver V40). */
@Entity
@Table(name = "public_event")
public class PublicEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String kind;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(length = 300)
    private String streets;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(length = 300)
    private String url;

    @Column(name = "affects_accesses", nullable = false)
    private boolean affectsAccesses;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PublicEvent() {
        // Constructor vacio requerido por JPA.
    }

    public PublicEvent(String kind, String title, String description, String streets, Instant startsAt,
                       Instant endsAt, BigDecimal latitude, BigDecimal longitude, String url,
                       boolean affectsAccesses) {
        this.kind = kind;
        this.title = title;
        this.description = description;
        this.streets = streets;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.latitude = latitude;
        this.longitude = longitude;
        this.url = url;
        this.affectsAccesses = affectsAccesses;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getKind() {
        return kind;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getStreets() {
        return streets;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public String getUrl() {
        return url;
    }

    public boolean isAffectsAccesses() {
        return affectsAccesses;
    }

    public boolean isActive() {
        return active;
    }

    public void deactivate() {
        this.active = false;
    }
}
