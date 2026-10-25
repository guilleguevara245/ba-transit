-- Tarifas vigentes desde el 1 de octubre de 2026, con SUBE registrada.
-- Fuentes:
--   * Colectivos (lineas de jurisdiccion nacional) y trenes:
--     argentina.gob.ar/redsube/tarifas-de-transporte-publico-amba
--   * Subte: GCBA, informado por enelsubte.com e Infobae (29/09/2026).
--
-- Notas de alcance:
--   * Subte: se carga la tarifa base (viajes 1 a 20 del mes). Los
--     descuentos por frecuencia (20%, 30% y 40% a partir de los viajes
--     21, 31 y 41) no entran en el modelo actual de tarifa por tramo.
--   * Trenes: la tarifa es por seccion (1: hasta 12 km, 2: de 12 a
--     24 km, 3: mas de 24 km), igual para todas las lineas.
--   * Premetro: queda afuera hasta confirmar el valor; las fuentes
--     consultadas no coinciden.
--   * Las tarifas se actualizan seguido. Para cargar nuevas sin perder
--     historial: desactivar las vigentes (active = false) e insertar
--     las nuevas con su effective_from, en una migracion nueva.

INSERT INTO fare (mode, min_km, max_km, price, effective_from) VALUES
    ('SUBTE',     NULL,  NULL,  1817.00, DATE '2026-10-01'),

    ('COLECTIVO',  0.00,  3.00,  742.81, DATE '2026-10-01'),
    ('COLECTIVO',  3.00,  6.00,  861.66, DATE '2026-10-01'),
    ('COLECTIVO',  6.00, 12.00, 1002.80, DATE '2026-10-01'),
    ('COLECTIVO', 12.00, 27.00, 1151.36, DATE '2026-10-01'),
    ('COLECTIVO', 27.00,  NULL, 1337.06, DATE '2026-10-01'),

    ('TREN',       0.00, 12.00,  450.00, DATE '2026-10-01'),
    ('TREN',      12.00, 24.00,  640.00, DATE '2026-10-01'),
    ('TREN',      24.00,  NULL,  790.00, DATE '2026-10-01');
