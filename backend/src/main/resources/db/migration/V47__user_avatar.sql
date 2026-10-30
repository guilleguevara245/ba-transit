-- Imagen de la cuenta: un avatar del sitio, la foto de Google o una foto propia.
-- avatar_kind: 'avatar' | 'google' | 'foto' (null = la inicial del nombre).
-- avatar_value: el avatar elegido ("subte-b", "colectivo"...).
-- google_picture: la foto de la cuenta de Google (la direccion que da Google al ingresar).
-- photo: la foto propia, ya recortada y achicada en el navegador (JPEG de 256 px, unos 20 KB).
ALTER TABLE app_user
    ADD COLUMN avatar_kind    VARCHAR(10),
    ADD COLUMN avatar_value   VARCHAR(40),
    ADD COLUMN google_picture VARCHAR(500),
    ADD COLUMN photo          BYTEA,
    ADD COLUMN photo_type     VARCHAR(20);
