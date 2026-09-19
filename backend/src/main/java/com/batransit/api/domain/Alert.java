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

    /**
     * Id que la fuente externa (API Transporte) le da a esta alerta.
     * Nulo para las alertas cargadas a mano por POST. Sirve para
     * encontrar y actualizar la misma alerta en la proxima corrida
     * del job, en vez de duplicarla.
     */
    @Column(name = "external_id", length = 100)
    private String externalId;

    /**
     * Valores numericos "cause"/"effect" del estandar GTFS-Realtime,
     * guardados tal cual vienen. El mapeo a AlertType es una
     * aproximacion (ver AlertType); conservar el original permite
     * corregir el mapeo despues sin perder informacion.
     */
    @Column(name = "source_cause")
    private Integer sourceCause;

    @Column(name = "source_effect")
    private Integer sourceEffect;

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

    public Alert(TransportLine transportLine, AlertType type, String description, String source,
                 String externalId, Integer sourceCause, Integer sourceEffect) {
        this(transportLine, type, description, source);
        this.externalId = externalId;
        this.sourceCause = sourceCause;
        this.sourceEffect = sourceEffect;
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

    public String getExternalId() {
        return externalId;
    }

    public Integer getSourceCause() {
        return sourceCause;
    }

    public Integer getSourceEffect() {
        return sourceEffect;
    }

    /**
     * Actualiza los campos que pueden cambiar entre una corrida del
     * job y la siguiente, cuando la alerta ya existia (mismo
     * externalId). No toca id, transportLine, source, ni las fechas
     * de creacion/publicacion originales.
     */
    public void updateFromSource(AlertType type, String description, Integer sourceCause, Integer sourceEffect) {
        this.type = type;
        this.description = description;
        this.sourceCause = sourceCause;
        this.sourceEffect = sourceEffect;
        this.active = true;
    }
}
