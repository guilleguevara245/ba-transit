-- Eventos masivos y cortes cargados a mano (recitales, maratones, road
-- shows) que la API Transporte puede no traer o traer tarde. Se cargan
-- con POST /api/v1/eventos (requiere X-API-Key) y se muestran hasta que
-- terminan. affects_accesses: el corte toca una autopista o avenida de
-- acceso y se muestra tambien en Accesos.
CREATE TABLE public_event (
    id               BIGSERIAL     PRIMARY KEY,
    kind             VARCHAR(20)   NOT NULL DEFAULT 'EVENTO',
    title            VARCHAR(150)  NOT NULL,
    description      VARCHAR(500),
    streets          VARCHAR(300),
    starts_at        TIMESTAMPTZ   NOT NULL,
    ends_at          TIMESTAMPTZ,
    latitude         NUMERIC(10, 7),
    longitude        NUMERIC(10, 7),
    url              VARCHAR(300),
    affects_accesses BOOLEAN       NOT NULL DEFAULT FALSE,
    active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_public_event_dates CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT chk_public_event_kind CHECK (kind IN ('EVENTO', 'MANIFESTACION', 'OBRA', 'CORTE'))
);

CREATE INDEX idx_public_event_active ON public_event (active, starts_at);
