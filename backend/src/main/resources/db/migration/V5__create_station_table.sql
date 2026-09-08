CREATE TABLE station (
    id                 BIGSERIAL PRIMARY KEY,
    transport_line_id  BIGINT       NOT NULL REFERENCES transport_line (id),
    name               VARCHAR(100) NOT NULL,
    sequence_order     INTEGER      NOT NULL,
    active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_station_line_sequence UNIQUE (transport_line_id, sequence_order)
);

CREATE INDEX idx_station_transport_line ON station (transport_line_id);
