package com.batransit.api.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Una alerta de servicio sobre una TransportLine completa (no un
 * ramal puntual). Por ahora se cargan a mano via POST; en la Fase 4
 * se suma la ingesta automatica desde fuentes oficiales.
 */
@Entity
@Table(name = "alert")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_line_id", nullable = false)
    @JsonIgnore
    private TransportLine transportLine;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AlertType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String source;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Alert() {
        // Constructor vacio requerido por JPA.
    }

    public Alert(TransportLine transportLine, AlertType type, String description, String source) {
        this.transportLine = transportLine;
        this.type = type;
        this.description = description;
        this.source = source;
        this.active = true;
        this.publishedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    @JsonProperty("transportLineId")
    public Long transportLineId() {
        return transportLine.getId();
    }

    public AlertType getType() {
        return type;
    }

    public String getDescription() {
        return description;
    }

    public String getSource() {
        return source;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
