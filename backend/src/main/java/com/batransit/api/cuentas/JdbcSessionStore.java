package com.batransit.api.cuentas;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

/** Sesiones en la tabla user_session. */
@Component
public class JdbcSessionStore implements SessionStore {

    /** El ultimo uso se anota como mucho cada tanto (no en cada pedido). */
    static final Duration TOUCH_EVERY = Duration.ofMinutes(5);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;

    public JdbcSessionStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 128 bits al azar en base64url (22 caracteres). */
    static String newId() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Override
    public String create(long userId, String device, Instant now) {
        String id = newId();
        jdbc.update("INSERT INTO user_session (id, user_id, device, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
                id, userId, device, Timestamp.from(now), Timestamp.from(now));
        return id;
    }

    /**
     * En una transaccion propia: se llama tambien desde consultas de solo
     * lectura (ver la cuenta, los favoritos), donde no se podria escribir.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean touch(String sessionId, long userId, Instant now) {
        Integer found = jdbc.queryForObject("SELECT COUNT(*) FROM user_session WHERE id = ? AND user_id = ?",
                Integer.class, sessionId, userId);
        if (found == null || found == 0) {
            return false;
        }
        jdbc.update("UPDATE user_session SET last_seen_at = ? WHERE id = ? AND last_seen_at < ?",
                Timestamp.from(now), sessionId, Timestamp.from(now.minus(TOUCH_EVERY)));
        return true;
    }

    @Override
    public List<SessionInfo> list(long userId) {
        return jdbc.query("SELECT id, device, created_at, last_seen_at FROM user_session WHERE user_id = ? "
                        + "ORDER BY last_seen_at DESC",
                (rs, i) -> new SessionInfo(rs.getString("id"), rs.getString("device"),
                        rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("last_seen_at").toInstant()),
                userId);
    }

    @Override
    public boolean delete(String sessionId, long userId) {
        return jdbc.update("DELETE FROM user_session WHERE id = ? AND user_id = ?", sessionId, userId) > 0;
    }

    @Override
    public int deleteOthers(long userId, String keep) {
        return keep == null
                ? jdbc.update("DELETE FROM user_session WHERE user_id = ?", userId)
                : jdbc.update("DELETE FROM user_session WHERE user_id = ? AND id <> ?", userId, keep);
    }

    @Override
    public int cleanup(Instant before) {
        return jdbc.update("DELETE FROM user_session WHERE last_seen_at < ?", Timestamp.from(before));
    }

    /** Una vez por dia: las sesiones sin uso en mas de lo que dura un token ya no sirven. */
    @Scheduled(initialDelay = 900_000L, fixedDelay = 24 * 3600_000L)
    public void dailyCleanup() {
        cleanup(Instant.now().minus(TokenService.VALIDITY));
    }
}
