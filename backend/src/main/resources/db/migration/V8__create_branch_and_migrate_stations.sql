-- Tabla de ramales
CREATE TABLE branch (
    id                 BIGSERIAL PRIMARY KEY,
    transport_line_id  BIGINT       NOT NULL REFERENCES transport_line (id),
    name               VARCHAR(100) NOT NULL,
    active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_line_name UNIQUE (transport_line_id, name)
);

CREATE INDEX idx_branch_transport_line ON branch (transport_line_id);

-- Ramal unico para las lineas que hoy funcionan de punta a punta, sin bifurcaciones
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Ramal único' FROM transport_line WHERE mode IN ('SUBTE', 'PREMETRO');

-- Migrar las estaciones existentes: de apuntar directo a la linea, a apuntar a su ramal
ALTER TABLE station ADD COLUMN branch_id BIGINT REFERENCES branch (id);

UPDATE station s
SET branch_id = b.id
FROM branch b
WHERE b.transport_line_id = s.transport_line_id;

ALTER TABLE station ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE station DROP CONSTRAINT uq_station_line_sequence;
DROP INDEX idx_station_transport_line;
ALTER TABLE station DROP COLUMN transport_line_id;

ALTER TABLE station ADD CONSTRAINT uq_station_branch_sequence UNIQUE (branch_id, sequence_order);
CREATE INDEX idx_station_branch ON station (branch_id);
