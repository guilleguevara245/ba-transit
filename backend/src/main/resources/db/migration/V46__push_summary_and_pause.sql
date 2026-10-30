-- Avisos: resumen diario de los favoritos y pausa.
-- summary_time: hora del resumen ("07:30", hora de Buenos Aires); null = sin resumen.
-- summary_days: dias de la semana del resumen (1 = lunes ... 7 = domingo), por ejemplo "12345".
-- greeting_name: el nombre para saludar en el resumen (opcional).
-- paused_until: hasta cuando no se manda ningun aviso (null = sin pausa).
-- last_train_minutes: cuanto antes del ultimo tren avisar (null = no avisar).
ALTER TABLE push_subscription
    ADD COLUMN summary_time       VARCHAR(5),
    ADD COLUMN summary_days       VARCHAR(7)  NOT NULL DEFAULT '12345',
    ADD COLUMN greeting_name      VARCHAR(40),
    ADD COLUMN paused_until       TIMESTAMPTZ,
    ADD COLUMN last_train_minutes SMALLINT;
