package com.batransit.api.notificaciones;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/** Un navegador con los avisos activados (tabla push_subscription, ver V45). */
@Entity
@Table(name = "push_subscription")
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String endpoint;

    @Column(nullable = false, length = 200)
    private String p256dh;

    @Column(nullable = false, length = 100)
    private String auth;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String favorites = "{}";

    @Column(nullable = false, length = 160)
    private String kinds = "lineas,estaciones,accesos";

    @Column(name = "notify_resolved", nullable = false)
    private boolean notifyResolved = true;

    @Column(name = "quiet_from")
    private Short quietFrom;

    @Column(name = "quiet_to")
    private Short quietTo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "last_sent_at")
    private Instant lastSentAt;

    /** Hora del resumen diario ("07:30"); null = sin resumen. */
    @Column(name = "summary_time", length = 5)
    private String summaryTime;

    /** Dias del resumen: 1 = lunes ... 7 = domingo ("12345"). */
    @Column(name = "summary_days", nullable = false, length = 7)
    private String summaryDays = "12345";

    @Column(name = "greeting_name", length = 40)
    private String greetingName;

    @Column(name = "paused_until")
    private Instant pausedUntil;

    @Column(name = "last_train_minutes")
    private Short lastTrainMinutes;

    /** Zonas para las alertas del SMN (ver NoticeZones); null = todo el AMBA. */
    @Column(length = 120)
    private String zones;

    /** Hora de "El clima y tu viaje" ("07:00"); null = apagado. */
    @Column(name = "trip_weather_time", length = 5)
    private String tripWeatherTime;

    protected PushSubscription() {
        // Para JPA.
    }

    public PushSubscription(String endpoint, String p256dh, String auth) {
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    public Long getId() {
        return id;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public String getP256dh() {
        return p256dh;
    }

    public String getAuth() {
        return auth;
    }

    public Long getUserId() {
        return userId;
    }

    public String getFavorites() {
        return favorites;
    }

    public String getKinds() {
        return kinds;
    }

    public boolean isNotifyResolved() {
        return notifyResolved;
    }

    public Short getQuietFrom() {
        return quietFrom;
    }

    public Short getQuietTo() {
        return quietTo;
    }

    public Instant getLastSentAt() {
        return lastSentAt;
    }

    /** Actualiza claves y preferencias (al volver a suscribirse o cambiar favoritos). */
    public void update(String p256dh, String auth, Long userId, String favorites, String kinds, boolean notifyResolved,
                       Short quietFrom, Short quietTo, Instant now) {
        this.p256dh = p256dh;
        this.auth = auth;
        this.userId = userId;
        this.favorites = favorites;
        this.kinds = kinds;
        this.notifyResolved = notifyResolved;
        this.quietFrom = quietFrom;
        this.quietTo = quietTo;
        this.updatedAt = now;
    }

    public String getSummaryTime() {
        return summaryTime;
    }

    public String getSummaryDays() {
        return summaryDays;
    }

    public String getGreetingName() {
        return greetingName;
    }

    public Instant getPausedUntil() {
        return pausedUntil;
    }

    public Short getLastTrainMinutes() {
        return lastTrainMinutes;
    }

    /** Resumen diario, nombre para saludar y aviso del ultimo tren. */
    public void updateExtras(String summaryTime, String summaryDays, String greetingName, Short lastTrainMinutes) {
        this.summaryTime = summaryTime;
        this.summaryDays = summaryDays;
        this.greetingName = greetingName;
        this.lastTrainMinutes = lastTrainMinutes;
    }

    public String getZones() {
        return zones;
    }

    /** Casa, Trabajo y la zona del clima, ya en el formato de NoticeZones.encode. */
    public void updateZones(String zones) {
        this.zones = zones;
    }

    public String getTripWeatherTime() {
        return tripWeatherTime;
    }

    public void updateTripWeather(String time) {
        this.tripWeatherTime = time;
    }

    public void pauseUntil(Instant until) {
        this.pausedUntil = until;
    }

    public void markSent(Instant at) {
        this.lastSentAt = at;
    }

    void setIdForTests(Long id) {
        this.id = id;
    }
}
