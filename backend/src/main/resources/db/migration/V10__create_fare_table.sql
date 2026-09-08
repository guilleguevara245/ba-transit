CREATE TABLE fare (
    id               BIGSERIAL PRIMARY KEY,
    mode             VARCHAR(30)   NOT NULL,
    min_km           NUMERIC(6, 2),
    max_km           NUMERIC(6, 2),
    price            NUMERIC(10, 2) NOT NULL,
    effective_from   DATE          NOT NULL,
    active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fare_mode ON fare (mode);
CREATE INDEX idx_fare_active ON fare (active);
