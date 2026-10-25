package com.batransit.api.domain;

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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Un servicio especial de una linea (por ejemplo, un tren rapido o un
 * recorrido distinto por obras), con dias, horario y fechas de vigencia.
 */
@Entity
@Table(name = "special_service")
public class SpecialService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_line_id", nullable = false)
    private TransportLine transportLine;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SpecialServiceKind kind = SpecialServiceKind.ESPECIAL;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(length = 60)
    private String days;

    @Column(length = 160)
    private String schedule;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    /** Aviso oficial con mas detalles (horarios, alternativas). */
    @Column(length = 300)
    private String url;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected SpecialService() {
        // Para JPA.
    }

    public SpecialService(TransportLine transportLine, String title, String description, String days,
                          String schedule, LocalDate validFrom, LocalDate validUntil) {
        this(transportLine, SpecialServiceKind.ESPECIAL, title, description, days, schedule, validFrom, validUntil,
                null);
    }

    public SpecialService(TransportLine transportLine, SpecialServiceKind kind, String title, String description,
                          String days, String schedule, LocalDate validFrom, LocalDate validUntil, String url) {
        this.transportLine = transportLine;
        this.kind = kind == null ? SpecialServiceKind.ESPECIAL : kind;
        this.url = url;
        this.title = title;
        this.description = description;
        this.days = days;
        this.schedule = schedule;
        this.validFrom = validFrom;
        this.validUntil = validUntil;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /** Vigente el dia indicado: activo y dentro de las fechas. */
    public boolean isValidOn(LocalDate day) {
        return active && !day.isBefore(validFrom) && (validUntil == null || !day.isAfter(validUntil));
    }

    public Long getId() {
        return id;
    }

    public TransportLine getTransportLine() {
        return transportLine;
    }

    public SpecialServiceKind getKind() {
        return kind;
    }

    public String getUrl() {
        return url;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getDays() {
        return days;
    }

    public String getSchedule() {
        return schedule;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public boolean isActive() {
        return active;
    }

    public void deactivate() {
        this.active = false;
    }
}
