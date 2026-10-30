-- Preferencias de la cuenta que se sincronizan entre dispositivos: el tema
-- (claro u oscuro) y las preferencias de avisos (que avisar, horario sin
-- avisos, resumen diario, ultimo subte), en JSON.
ALTER TABLE app_user ADD COLUMN preferences TEXT NOT NULL DEFAULT '{}';
ALTER TABLE app_user ADD COLUMN preferences_updated_at TIMESTAMPTZ;
