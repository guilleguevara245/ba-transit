-- Mis lugares: Casa, Trabajo y otros lugares guardados de la cuenta, en JSON
-- ({"lugares":[{"tipo":"casa","nombre":"Casa","estacion":123,"direccion":null}, ...]}).
-- Cada lugar es una estacion (para "Como llegar") o una direccion (Google Maps).
ALTER TABLE app_user ADD COLUMN places TEXT NOT NULL DEFAULT '{}';
ALTER TABLE app_user ADD COLUMN places_updated_at TIMESTAMPTZ;
