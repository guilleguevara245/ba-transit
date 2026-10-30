package com.batransit.api.cuentas;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Sesiones en memoria, para los tests (sin base de datos). */
class MemorySessionStore implements SessionStore {

    private record Row(long userId, SessionInfo info) {
    }

    private final Map<String, Row> rows = new ConcurrentHashMap<>();

    @Override
    public String create(long userId, String device, Instant now) {
        String id = JdbcSessionStore.newId();
        rows.put(id, new Row(userId, new SessionInfo(id, device, now, now)));
        return id;
    }

    @Override
    public boolean touch(String sessionId, long userId, Instant now) {
        Row row = rows.get(sessionId);
        if (row == null || row.userId() != userId) {
            return false;
        }
        rows.put(sessionId, new Row(userId, new SessionInfo(sessionId, row.info().device(), row.info().createdAt(), now)));
        return true;
    }

    @Override
    public List<SessionInfo> list(long userId) {
        List<SessionInfo> out = new ArrayList<>();
        rows.values().stream().filter(r -> r.userId() == userId).forEach(r -> out.add(r.info()));
        out.sort(Comparator.comparing(SessionInfo::lastSeenAt).reversed());
        return out;
    }

    @Override
    public boolean delete(String sessionId, long userId) {
        Row row = rows.get(sessionId);
        return row != null && row.userId() == userId && rows.remove(sessionId) != null;
    }

    @Override
    public int deleteOthers(long userId, String keep) {
        List<String> ids = rows.entrySet().stream()
                .filter(e -> e.getValue().userId() == userId && !e.getKey().equals(keep)).map(Map.Entry::getKey).toList();
        ids.forEach(rows::remove);
        return ids.size();
    }

    @Override
    public int cleanup(Instant before) {
        List<String> ids = rows.entrySet().stream()
                .filter(e -> e.getValue().info().lastSeenAt().isBefore(before)).map(Map.Entry::getKey).toList();
        ids.forEach(rows::remove);
        return ids.size();
    }
}
