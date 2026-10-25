-- Copia de los datos de colectivos ya procesados (JSON comprimido con
-- gzip). Permite responder apenas arranca el servidor, sin esperar a
-- descargar y procesar el feed GTFS (cientos de MB). Una sola fila.
CREATE TABLE colectivos_snapshot (
    id         SMALLINT    PRIMARY KEY CHECK (id = 1),
    loaded_at  TIMESTAMPTZ NOT NULL,
    data       BYTEA       NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
