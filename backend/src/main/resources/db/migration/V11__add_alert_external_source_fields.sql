ALTER TABLE alert ADD COLUMN external_id VARCHAR(100);
ALTER TABLE alert ADD COLUMN source_cause INTEGER;
ALTER TABLE alert ADD COLUMN source_effect INTEGER;

-- Indice unico parcial: permite muchas alertas con external_id nulo
-- (las cargadas a mano por POST), pero nunca dos con el mismo id externo.
CREATE UNIQUE INDEX uq_alert_external_id ON alert (external_id) WHERE external_id IS NOT NULL;
