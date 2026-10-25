-- Servicios especiales de trenes (rapidos, diferenciales, trenes por
-- eventos: kind = ESPECIAL) y cambios en el servicio (recorridos
-- limitados, estaciones cerradas por obras: kind = CAMBIO). Se cargan a
-- mano con POST /api/v1/servicios-especiales (requiere X-API-Key) y se
-- muestran solo mientras estan vigentes. url: aviso oficial.
CREATE TABLE special_service (
    id                BIGSERIAL    PRIMARY KEY,
    transport_line_id BIGINT       NOT NULL REFERENCES transport_line (id),
    kind              VARCHAR(20)  NOT NULL DEFAULT 'ESPECIAL',
    title             VARCHAR(120) NOT NULL,
    description       VARCHAR(500),
    days              VARCHAR(60),
    schedule          VARCHAR(160),
    valid_from        DATE         NOT NULL,
    valid_until       DATE,
    url               VARCHAR(300),
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_special_service_dates CHECK (valid_until IS NULL OR valid_until >= valid_from),
    CONSTRAINT chk_special_service_kind CHECK (kind IN ('ESPECIAL', 'CAMBIO'))
);

CREATE INDEX idx_special_service_line ON special_service (transport_line_id);
