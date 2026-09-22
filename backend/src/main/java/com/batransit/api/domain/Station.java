package com.batransit.api.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Una estacion o parada dentro de un Branch (ramal), con su orden
 * dentro del recorrido (1, 2, 3...) y su ubicacion geografica real,
 * usada en el mapa de la Fase 6.
 */
@Entity
@Table(
        name = "station",
        uniqueConstraints = @UniqueConstraint(columnNames = {"branch_id", "sequence_order"})
)
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    @JsonIgnore
    private Branch branch;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Station() {
        // Constructor vacio requerido por JPA.
    }

    public Station(Branch branch, String name, Integer sequenceOrder) {
        this.branch = branch;
        this.name = name;
        this.sequenceOrder = sequenceOrder;
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public Branch getBranch() {
        return branch;
    }

    /**
     * Sin prefijo "get" a proposito, mismo motivo que en Branch:
     * evita que Spring Data confunda esto con un atributo real al
     * derivar queries como findByBranchIdOrderBySequenceOrderAsc.
     */
    @JsonProperty("branchId")
    public Long branchId() {
        return branch.getId();
    }

    public String getName() {
        return name;
    }

    public Integer getSequenceOrder() {
        return sequenceOrder;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setCoordinates(BigDecimal latitude, BigDecimal longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
