package com.batransit.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Representa una linea de transporte (por ejemplo, la Linea A de Subte,
 * o la Linea Roca de trenes). No representa un servicio en tiempo real,
 * sino el dato "estatico" de que esa linea existe, con su color oficial
 * para mostrar en el frontend.
 */
@Entity
@Table(
        name = "transport_line",
        uniqueConstraints = @UniqueConstraint(columnNames = {"mode", "code"})
)
public class TransportLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Modo de transporte (ver TransportMode). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TransportMode mode;

    /** Identificador corto de la linea dentro de su modo (ej: "A", "152"). */
    @Column(nullable = false, length = 10)
    private String code;

    /** Nombre completo para mostrar (ej: "Linea A", "Linea Roca"). */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Nombre en minusculas y sin tildes, calculado por la base (columna
     * GENERATED, ver V22). Solo se lee: se usa para la busqueda.
     */
    @Column(name = "search_name", insertable = false, updatable = false)
    private String searchName;

    /** Color oficial de la linea, en formato hexadecimal (#RRGGBB). */
    @Column(name = "color_hex", nullable = false, length = 7)
    private String colorHex;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TransportLine() {
        // Constructor vacio requerido por JPA.
    }

    public TransportLine(TransportMode mode, String code, String name, String colorHex) {
        this.mode = mode;
        this.code = code;
        this.name = name;
        this.colorHex = colorHex;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public TransportMode getMode() {
        return mode;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getColorHex() {
        return colorHex;
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
