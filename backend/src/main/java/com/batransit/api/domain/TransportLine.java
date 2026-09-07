package com.batransit.api.domain;

import jakarta.persistence.Column;
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

    /** Modo de transporte: SUBTE, TREN, PREMETRO, COLECTIVO, AEROPUERTO. */
    @Column(nullable = false, length = 30)
    private String mode;

    /** Identificador corto de la linea dentro de su modo (ej: "A", "152"). */
    @Column(nullable = false, length = 10)
    private String code;

    /** Nombre completo para mostrar (ej: "Linea A", "Linea Roca"). */
    @Column(nullable = false, length = 100)
    private String name;

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

    public TransportLine(String mode, String code, String name, String colorHex) {
        this.mode = mode;
        this.code = code;
        this.name = name;
        this.colorHex = colorHex;
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public String getMode() {
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
