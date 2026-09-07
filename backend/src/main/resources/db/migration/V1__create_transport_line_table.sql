CREATE TABLE transport_line (
    id          BIGSERIAL PRIMARY KEY,
    mode        VARCHAR(30)  NOT NULL,
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    color_hex   VARCHAR(7)   NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_transport_line_mode_code UNIQUE (mode, code)
);

CREATE INDEX idx_transport_line_mode ON transport_line (mode);
