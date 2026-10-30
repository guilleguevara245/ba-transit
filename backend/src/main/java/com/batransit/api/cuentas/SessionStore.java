package com.batransit.api.cuentas;

import java.time.Instant;
import java.util.List;

/** Las sesiones abiertas de cada cuenta (una por dispositivo). */
public interface SessionStore {

    /** Una sesion: id, dispositivo ("Chrome en Windows"), cuando empezo y cuando se uso por ultima vez. */
    record SessionInfo(String id, String device, Instant createdAt, Instant lastSeenAt) {
    }

    /** Abre una sesion nueva y devuelve su id. */
    String create(long userId, String device, Instant now);

    /** Si la sesion existe (y es de esa cuenta); de paso anota que se uso. */
    boolean touch(String sessionId, long userId, Instant now);

    List<SessionInfo> list(long userId);

    /** Cierra una sesion de la cuenta; false si no existia. */
    boolean delete(String sessionId, long userId);

    /** Cierra todas menos keep (keep null: todas). */
    int deleteOthers(long userId, String keep);

    /** Borra las que no se usan desde before (los tokens ya vencieron). */
    int cleanup(Instant before);
}
