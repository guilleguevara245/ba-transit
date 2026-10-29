-- Notificaciones (Web Push). No hace falta cuenta: cada navegador que
-- activa los avisos es una suscripcion, con los favoritos sobre los que
-- quiere enterarse y sus preferencias.

-- Ajustes del servidor que se generan solos y tienen que sobrevivir a
-- los reinicios (por ejemplo, las claves VAPID de los avisos).
CREATE TABLE app_setting (
    key        VARCHAR(80) PRIMARY KEY,
    value      TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- endpoint, p256dh y auth: los da el navegador al suscribirse.
-- favorites: {"lineas":[..],"estaciones":[..],"accesos":[..]}.
-- kinds: tipos de aviso elegidos ("lineas,estaciones,accesos").
-- quiet_from / quiet_to: horas sin avisos (hora de Buenos Aires); null = sin pausa.
CREATE TABLE push_subscription (
    id            BIGSERIAL PRIMARY KEY,
    endpoint      VARCHAR(1000) NOT NULL UNIQUE,
    p256dh        VARCHAR(200)  NOT NULL,
    auth          VARCHAR(100)  NOT NULL,
    user_id       BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    favorites     TEXT          NOT NULL DEFAULT '{}',
    kinds         VARCHAR(60)   NOT NULL DEFAULT 'lineas,estaciones,accesos',
    notify_resolved BOOLEAN     NOT NULL DEFAULT TRUE,
    quiet_from    SMALLINT,
    quiet_to      SMALLINT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    last_sent_at  TIMESTAMPTZ
);

-- Que aviso ya le llego a cada suscripcion (para no repetir): event_key es,
-- por ejemplo, "alerta:123", "alerta-fin:123" o "acceso:oeste:CABA:CONGESTIONADO".
CREATE TABLE push_sent (
    subscription_id BIGINT       NOT NULL REFERENCES push_subscription (id) ON DELETE CASCADE,
    event_key       VARCHAR(160) NOT NULL,
    sent_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (subscription_id, event_key)
);

CREATE INDEX push_sent_sent_at_idx ON push_sent (sent_at);
