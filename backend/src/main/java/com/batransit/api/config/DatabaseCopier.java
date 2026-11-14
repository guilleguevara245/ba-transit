package com.batransit.api.config;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Copia los datos de la base anterior a la nueva, una sola vez: las cuentas,
 * los favoritos, las suscripciones a notificaciones, las claves para
 * enviarlas, los eventos cargados a mano y las alertas.
 *
 * La base nueva ya tiene el esquema (Flyway corre antes). Todo va en una
 * transaccion: si algo falla no queda nada a medias y se vuelve a intentar
 * en el proximo arranque. Al terminar deja una marca en app_setting y no
 * vuelve a copiar, para no pisar lo que se cargue despues.
 */
public final class DatabaseCopier {

    /** La marca de que la copia ya se hizo. */
    static final String DONE_KEY = "base-copiada-desde-la-anterior";

    /**
     * Lo que no se copia: el historial de Flyway (la base nueva ya tiene el
     * suyo), la foto de los colectivos (se vuelve a bajar sola) y los avisos
     * ya enviados (solo sirven para no repetir los de las ultimas horas).
     */
    static final Set<String> SKIPPED = Set.of("flyway_schema_history", "colectivos_snapshot", "push_sent");

    private static final int BATCH = 500;

    private DatabaseCopier() {
    }

    /**
     * Copia si todavia no se copio. Devuelve las filas copiadas por tabla, o
     * un mapa vacio si ya estaba hecha.
     */
    public static Map<String, Integer> copyIfNeeded(Connection target, Connection source) throws SQLException {
        if (alreadyCopied(target)) {
            return Map.of();
        }
        Set<String> sourceTables = tables(source);
        List<String> order = new ArrayList<>();
        for (String table : parentsFirst(target)) {
            if (!SKIPPED.contains(table) && sourceTables.contains(table)) {
                order.add(table);
            }
        }
        boolean autoCommit = target.getAutoCommit();
        boolean sourceAutoCommit = source.getAutoCommit();
        target.setAutoCommit(false);
        // Sin autocommit el driver trae las filas de a tandas (fetchSize) y no todas juntas.
        source.setAutoCommit(false);
        Map<String, Integer> copied = new LinkedHashMap<>();
        try {
            if (!order.isEmpty()) {
                try (Statement st = target.createStatement()) {
                    st.execute("TRUNCATE TABLE " + String.join(", ", order.stream().map(t -> "public." + quote(t)).toList())
                            + " CASCADE");
                }
            }
            for (String table : order) {
                copied.put(table, copyTable(target, source, table));
            }
            fixSequences(target);
            try (PreparedStatement ps = target.prepareStatement(
                    "INSERT INTO app_setting (key, value) VALUES (?, now()::text) "
                            + "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()")) {
                ps.setString(1, DONE_KEY);
                ps.executeUpdate();
            }
            target.commit();
            return copied;
        } catch (SQLException | RuntimeException e) {
            target.rollback();
            throw e;
        } finally {
            source.rollback();
            source.setAutoCommit(sourceAutoCommit);
            target.setAutoCommit(autoCommit);
        }
    }

    private static boolean alreadyCopied(Connection target) throws SQLException {
        try (PreparedStatement ps = target.prepareStatement("SELECT 1 FROM app_setting WHERE key = ?")) {
            ps.setString(1, DONE_KEY);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static int copyTable(Connection target, Connection source, String table) throws SQLException {
        // Las columnas calculadas (como search_name) las arma la base sola.
        List<String> columns = new ArrayList<>(columns(target, table, true));
        columns.retainAll(columns(source, table, false));
        if (columns.isEmpty()) {
            return 0;
        }
        String list = String.join(", ", columns.stream().map(DatabaseCopier::quote).toList());
        String marks = String.join(", ", columns.stream().map(c -> "?").toList());
        int count = 0;
        try (Statement read = source.createStatement()) {
            read.setFetchSize(BATCH);
            try (ResultSet rs = read.executeQuery("SELECT " + list + " FROM public." + quote(table));
                 PreparedStatement write = target.prepareStatement(
                         "INSERT INTO public." + quote(table) + " (" + list + ") VALUES (" + marks + ")")) {
                while (rs.next()) {
                    for (int i = 1; i <= columns.size(); i++) {
                        write.setObject(i, rs.getObject(i));
                    }
                    write.addBatch();
                    count++;
                    if (count % BATCH == 0) {
                        write.executeBatch();
                    }
                }
                write.executeBatch();
            }
        }
        return count;
    }

    /** Las secuencias de los id siguen desde el mayor copiado, para que no choquen las filas nuevas. */
    private static void fixSequences(Connection target) throws SQLException {
        List<String[]> serials = new ArrayList<>();
        try (Statement st = target.createStatement();
             ResultSet rs = st.executeQuery("SELECT table_name, column_name FROM information_schema.columns "
                     + "WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'")) {
            while (rs.next()) {
                serials.add(new String[] {rs.getString(1), rs.getString(2)});
            }
        }
        for (String[] s : serials) {
            String table = quote(s[0]);
            String column = quote(s[1]);
            try (Statement st = target.createStatement()) {
                st.execute("SELECT setval(pg_get_serial_sequence('public." + table + "', '" + s[1] + "'), "
                        + "COALESCE((SELECT MAX(" + column + ") FROM public." + table + "), 0) + 1, false)");
            }
        }
    }

    private static Set<String> tables(Connection connection) throws SQLException {
        Set<String> result = new LinkedHashSet<>();
        try (Statement st = connection.createStatement();
             ResultSet rs = st.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1")) {
            while (rs.next()) {
                result.add(rs.getString(1));
            }
        }
        return result;
    }

    private static List<String> columns(Connection connection, String table, boolean writableOnly) throws SQLException {
        List<String> result = new ArrayList<>();
        try (PreparedStatement ps = connection.prepareStatement("SELECT column_name FROM information_schema.columns "
                + "WHERE table_schema = 'public' AND table_name = ?"
                + (writableOnly ? " AND is_generated = 'NEVER'" : "") + " ORDER BY ordinal_position")) {
            ps.setString(1, table);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    result.add(rs.getString(1));
                }
            }
        }
        return result;
    }

    /** Las tablas de la base nueva, cada una despues de las que referencia (estaciones despues de lineas). */
    static List<String> parentsFirst(Connection connection) throws SQLException {
        Set<String> all = tables(connection);
        Map<String, Set<String>> parents = new HashMap<>();
        DatabaseMetaData meta = connection.getMetaData();
        for (String table : all) {
            Set<String> refs = new HashSet<>();
            try (ResultSet rs = meta.getImportedKeys(null, "public", table)) {
                while (rs.next()) {
                    String parent = rs.getString("PKTABLE_NAME");
                    if (!parent.equals(table)) {
                        refs.add(parent);
                    }
                }
            }
            parents.put(table, refs);
        }
        List<String> order = new ArrayList<>();
        Set<String> placed = new HashSet<>();
        while (order.size() < all.size()) {
            boolean progress = false;
            for (String table : all) {
                if (!placed.contains(table) && placed.containsAll(parents.get(table))) {
                    order.add(table);
                    placed.add(table);
                    progress = true;
                }
            }
            if (!progress) {
                // Referencias circulares: el resto en cualquier orden (el TRUNCATE ya las vacio).
                for (String table : all) {
                    if (placed.add(table)) {
                        order.add(table);
                    }
                }
            }
        }
        return order;
    }

    private static String quote(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    /** Para el log: "app_user 3, station 387, ...". */
    static String summary(Map<String, Integer> copied) {
        StringBuilder sb = new StringBuilder();
        copied.forEach((t, n) -> sb.append(sb.isEmpty() ? "" : ", ").append(t).append(' ').append(n));
        return sb.toString();
    }

}
