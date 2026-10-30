package com.batransit.api.notificaciones;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Lo que guardan los avisos con SQL directo: que aviso ya llego a cada
 * suscripcion (push_sent) y los ajustes generados por el servidor
 * (app_setting, por ejemplo las claves VAPID).
 */
@Component
public class PushStore {

    private final JdbcTemplate jdbc;

    public PushStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Marca el aviso como enviado; false si ya lo estaba (asi nunca se manda dos veces). */
    public boolean claim(long subscriptionId, String eventKey) {
        return jdbc.update("INSERT INTO push_sent (subscription_id, event_key) VALUES (?, ?) ON CONFLICT DO NOTHING",
                subscriptionId, eventKey) == 1;
    }

    public boolean wasSent(long subscriptionId, String eventKey) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM push_sent WHERE subscription_id = ? AND event_key = ?",
                Integer.class, subscriptionId, eventKey);
        return n != null && n > 0;
    }

    /** Borra lo enviado hace mas de 30 dias. */
    public int cleanup(Instant before) {
        return jdbc.update("DELETE FROM push_sent WHERE sent_at < ?", Timestamp.from(before));
    }

    public Optional<String> setting(String key) {
        List<String> values = jdbc.queryForList("SELECT value FROM app_setting WHERE key = ?", String.class, key);
        return values.stream().findFirst();
    }

    /** Guarda o reemplaza un ajuste. */
    public void saveSetting(String key, String value) {
        jdbc.update("INSERT INTO app_setting (key, value) VALUES (?, ?) "
                + "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()", key, value);
    }

    /** Guarda el ajuste si todavia no existe (si dos procesos lo crean a la vez, gana el primero). */
    public void saveSettingIfAbsent(String key, String value) {
        jdbc.update("INSERT INTO app_setting (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING", key, value);
    }
}
