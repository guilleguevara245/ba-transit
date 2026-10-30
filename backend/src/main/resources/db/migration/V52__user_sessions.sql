-- Sesiones de la cuenta, una por dispositivo, para listarlas en "Dispositivos"
-- y cerrarlas de a una. El token de cada sesion lleva su id; si la fila no
-- esta, el token ya no vale. device: navegador y sistema ("Chrome en Windows"),
-- sacado del User-Agent (no se guarda la IP ni la ubicacion).
CREATE TABLE user_session (
    id           VARCHAR(32)  PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    device       VARCHAR(80)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX user_session_user_idx ON user_session (user_id);
