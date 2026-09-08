package com.batransit.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Una tarifa vigente para un modo de transporte, opcionalmente
 * acotada a un tramo de distancia (minKm/maxKm). Si minKm y maxKm son
 * nulos, la tarifa es plana (no depende de la distancia), como el
 * subte. maxKm nulo con minKm cargado significa "de minKm en
 * adelante, sin techo" (ej: "mas de 24 km").
 */
@Entity
@Table(name = "fare")
public class Fare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String mode;

    @Column(name = "min_km", precision = 6, scale = 2)
    private BigDecimal minKm;

    @Column(name = "max_km", precision = 6, scale = 2)
    private BigDecimal maxKm;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Fare() {
        // Constructor vacio requerido por JPA.
    }

    public Fare(String mode, BigDecimal minKm, BigDecimal maxKm, BigDecimal price, LocalDate effectiveFrom) {
        this.mode = mode;
        this.minKm = minKm;
        this.maxKm = maxKm;
        this.price = price;
        this.effectiveFrom = effectiveFrom;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getMode() {
        return mode;
    }

    public BigDecimal getMinKm() {
        return minKm;
    }

    public BigDecimal getMaxKm() {
        return maxKm;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public LocalDate getEffectiveFrom() {
        return effectiveFrom;
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
