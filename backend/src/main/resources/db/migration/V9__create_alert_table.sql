CREATE TABLE alert (
    id                  BIGSERIAL PRIMARY KEY,
    transport_line_id   BIGINT       NOT NULL REFERENCES transport_line (id),
    type                VARCHAR(30)  NOT NULL,
    description         TEXT         NOT NULL,
    source              VARCHAR(100),
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    published_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_transport_line ON alert (transport_line_id);
CREATE INDEX idx_alert_active ON alert (active);
