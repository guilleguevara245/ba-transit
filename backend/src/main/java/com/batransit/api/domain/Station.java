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

import java.time.Instant;

/**
 * Una estacion o parada dentro de una TransportLine, con su orden
 * dentro del recorrido (1, 2, 3...). Las coordenadas geograficas se
 * agregan en una fase posterior, cuando se implemente el mapa.
 */
@Entity
@Table(
        name = "station",
        uniqueConstraints = @UniqueConstraint(columnNames = {"transport_line_id", "sequence_order"})
)
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * FetchType.LAZY: la linea no se carga de la base hasta que alguien
     * la pida explicitamente (getTransportLine()). Evita traer datos de
     * mas cuando solo nos interesan las estaciones.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_line_id", nullable = false)
    @JsonIgnore
    private TransportLine transportLine;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Station() {
        // Constructor vacio requerido por JPA.
    }

    public Station(TransportLine transportLine, String name, Integer sequenceOrder) {
        this.transportLine = transportLine;
        this.name = name;
        this.sequenceOrder = sequenceOrder;
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public TransportLine getTransportLine() {
        return transportLine;
    }

    /**
     * Devuelve solo el id de la linea, sin inicializar el proxy lazy
     * completo (Hibernate conoce el id de la FK sin ir a la base).
     * Se llama "getLineId" (no "getTransportLineId") a proposito: si
     * se llamara igual que la propiedad de la relacion, Spring Data
     * lo confunde con un atributo real al derivar queries por nombre
     * de metodo (findByTransportLineId...), rompiendo esas consultas.
     */
    @JsonProperty("transportLineId")
    public Long getLineId() {
        return transportLine.getId();
    }

    public String getName() {
        return name;
    }

    public Integer getSequenceOrder() {
        return sequenceOrder;
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
