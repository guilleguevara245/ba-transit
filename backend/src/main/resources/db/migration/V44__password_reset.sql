-- Recuperar la contrasena: links de un solo uso que vencen en una hora. Se
-- guarda el hash SHA-256 del codigo del link, nunca el codigo en si.
CREATE TABLE password_reset (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_user_idx ON password_reset (user_id);

-- Al cambiar la contrasena se cierran las sesiones abiertas: los tokens
-- emitidos antes de esta fecha dejan de valer.
ALTER TABLE app_user ADD COLUMN sessions_valid_after TIMESTAMPTZ;
