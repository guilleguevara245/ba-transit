-- Cuentas de usuario (opcionales: el sitio se usa igual sin cuenta).
-- Se entra con mail y contrasena (password_hash, PBKDF2) o con Google
-- (google_sub, el id de la cuenta de Google); una cuenta puede tener las dos.
-- favorites: los favoritos en JSON ({"lineas":[..],"estaciones":[..],"accesos":[..]}).
CREATE TABLE app_user (
    id                   BIGSERIAL PRIMARY KEY,
    email                VARCHAR(254) NOT NULL,
    display_name         VARCHAR(80),
    password_hash        VARCHAR(200),
    google_sub           VARCHAR(64),
    favorites            TEXT         NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at        TIMESTAMPTZ,
    favorites_updated_at TIMESTAMPTZ
);

-- El mail se guarda en minusculas; unico.
CREATE UNIQUE INDEX app_user_email_key ON app_user (email);
CREATE UNIQUE INDEX app_user_google_sub_key ON app_user (google_sub) WHERE google_sub IS NOT NULL;
