-- De donde sale cada evento: MANUAL (cargado con POST o en una migracion) o
-- CIUDAD (cortes leidos de las noticias del Gobierno de la Ciudad, ver
-- CityNoticesSyncService). La url de la noticia sirve para no cargar dos
-- veces el mismo corte.
ALTER TABLE public_event ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE public_event ADD CONSTRAINT chk_public_event_source CHECK (source IN ('MANUAL', 'CIUDAD'));
CREATE INDEX idx_public_event_url ON public_event (url);
