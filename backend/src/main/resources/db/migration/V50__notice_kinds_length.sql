-- Hay mas tipos de aviso (se sumo "colectivos"): la lista ya no entra en 60 caracteres.
ALTER TABLE push_subscription ALTER COLUMN kinds TYPE VARCHAR(160);
