package com.batransit.api.cuentas;

import com.batransit.api.cuentas.TokenService.Claims;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "Descargar mis datos": lo de la cuenta (AccountService) mas los avisos
 * activados con la cuenta iniciada. De cada aviso va el servicio (por
 * ejemplo fcm.googleapis.com) y las preferencias, no las claves.
 */
@Component
public class AccountDataExport {

    private final AccountService accounts;
    private final JdbcTemplate jdbc;

    public AccountDataExport(AccountService accounts, JdbcTemplate jdbc) {
        this.accounts = accounts;
        this.jdbc = jdbc;
    }

    public Map<String, Object> export(Claims session) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("generado", Instant.now());
        out.put("sitio", "BA Transit");
        out.putAll(accounts.exportData(session));
        List<Map<String, Object>> notices = jdbc.query(
                "SELECT endpoint, kinds, notify_resolved, quiet_from, quiet_to, summary_time, summary_days, "
                        + "greeting_name, last_train_minutes, paused_until, created_at, last_sent_at "
                        + "FROM push_subscription WHERE user_id = ? ORDER BY created_at",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("servicio", host(rs.getString("endpoint")));
                    row.put("tipos", List.of(rs.getString("kinds").split(",")));
                    row.put("avisarAlNormalizarse", rs.getBoolean("notify_resolved"));
                    row.put("sinAvisosDesde", rs.getObject("quiet_from"));
                    row.put("sinAvisosHasta", rs.getObject("quiet_to"));
                    row.put("resumenDiario", rs.getString("summary_time"));
                    row.put("diasDelResumen", rs.getString("summary_days"));
                    row.put("nombreDelSaludo", rs.getString("greeting_name"));
                    row.put("minutosAntesDelUltimoSubte", rs.getObject("last_train_minutes"));
                    row.put("pausadoHasta", instant(rs.getTimestamp("paused_until")));
                    row.put("activado", instant(rs.getTimestamp("created_at")));
                    row.put("ultimoAviso", instant(rs.getTimestamp("last_sent_at")));
                    return row;
                },
                session.userId());
        out.put("avisos", notices);
        return out;
    }

    static String host(String endpoint) {
        try {
            return URI.create(endpoint).getHost();
        } catch (IllegalArgumentException | NullPointerException e) {
            return null;
        }
    }

    private static Instant instant(java.sql.Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
