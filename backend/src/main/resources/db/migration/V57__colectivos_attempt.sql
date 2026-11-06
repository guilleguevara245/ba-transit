-- Cuando se intento por ultima vez bajar el feed GTFS de colectivos. Si el
-- servidor se reinicia a mitad de la descarga (por ejemplo, por memoria),
-- al volver no reintenta enseguida: espera como si el intento hubiera fallado.
ALTER TABLE colectivos_snapshot ADD COLUMN attempted_at TIMESTAMPTZ;
