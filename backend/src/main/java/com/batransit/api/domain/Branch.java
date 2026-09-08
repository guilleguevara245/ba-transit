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
 * Un ramal dentro de una TransportLine. La mayoria de las lineas de
 * subte tienen un unico ramal ("Ramal unico"); las lineas de tren
 * suelen tener varios (por ejemplo, Sarmiento se abre en Moreno y
 * Merlo-Lobos).
 */
@Entity
@Table(
        name = "branch",
        uniqueConstraints = @UniqueConstraint(columnNames = {"transport_line_id", "name"})
)
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_line_id", nullable = false)
    @JsonIgnore
    private TransportLine transportLine;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Branch() {
        // Constructor vacio requerido por JPA.
    }

    public Branch(TransportLine transportLine, String name) {
        this.transportLine = transportLine;
        this.name = name;
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
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

    /**
     * Sin prefijo "get" a proposito: evita que Spring Data lo confunda
     * con un atributo real al derivar queries como
     * findByTransportLineIdOrderByIdAsc (mismo problema que tuvimos
     * con Station).
     */
    @JsonProperty("transportLineId")
    public Long transportLineId() {
        return transportLine.getId();
    }
}
