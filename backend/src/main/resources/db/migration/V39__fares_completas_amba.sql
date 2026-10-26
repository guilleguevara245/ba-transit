-- Cuadro tarifario completo del AMBA desde octubre de 2026, segun Red
-- SUBE (argentina.gob.ar/redsube/tarifas-de-transporte-publico-amba,
-- actualizada el 02/10/2026):
--   * jurisdiction: colectivos NACIONAL, CABA o PROVINCIA.
--   * section: seccion de tren (1, 2, 3).
--   * trips_from / trips_to: viajes de subte en el mes (descuento por uso).
--   * price_unregistered: precio con la SUBE sin registrar.
ALTER TABLE fare
    ADD COLUMN jurisdiction       VARCHAR(20),
    ADD COLUMN section            SMALLINT,
    ADD COLUMN trips_from         SMALLINT,
    ADD COLUMN trips_to           SMALLINT,
    ADD COLUMN price_unregistered NUMERIC(10, 2);

-- Las tarifas ya cargadas en V21 (colectivos nacionales, trenes y subte 1-20 viajes).
UPDATE fare SET jurisdiction = 'NACIONAL',
    price_unregistered = CASE price
        WHEN 742.81 THEN 1485.62 WHEN 861.66 THEN 1723.32 WHEN 1002.80 THEN 2005.60
        WHEN 1151.36 THEN 2302.72 WHEN 1337.06 THEN 2674.12 END
WHERE mode = 'COLECTIVO' AND active AND effective_from = DATE '2026-10-01';

UPDATE fare SET section = CASE price WHEN 450.00 THEN 1 WHEN 640.00 THEN 2 WHEN 790.00 THEN 3 END,
    price_unregistered = price * 2
WHERE mode = 'TREN' AND active AND effective_from = DATE '2026-10-01';

UPDATE fare SET trips_from = 1, trips_to = 20, price_unregistered = 2525.63
WHERE mode = 'SUBTE' AND active AND effective_from = DATE '2026-10-01';

INSERT INTO fare (mode, jurisdiction, min_km, max_km, section, trips_from, trips_to, price, price_unregistered,
                  effective_from) VALUES
    ('SUBTE', NULL, NULL, NULL, NULL, 21, 30, 1453.60, 2525.63, DATE '2026-10-01'),
    ('SUBTE', NULL, NULL, NULL, NULL, 31, 40, 1271.90, 2525.63, DATE '2026-10-01'),
    ('SUBTE', NULL, NULL, NULL, NULL, 41, NULL, 1090.20, 2525.63, DATE '2026-10-01'),

    ('PREMETRO', NULL, NULL, NULL, NULL, NULL, NULL, 635.95, 883.97, DATE '2026-10-01'),

    ('COLECTIVO', 'CABA',  0.00,  3.00, NULL, NULL, NULL,  920.48, 1463.56, DATE '2026-10-01'),
    ('COLECTIVO', 'CABA',  3.00,  6.00, NULL, NULL, NULL, 1022.81, 1626.27, DATE '2026-10-01'),
    ('COLECTIVO', 'CABA',  6.00, 12.00, NULL, NULL, NULL, 1101.59, 1751.53, DATE '2026-10-01'),
    ('COLECTIVO', 'CABA', 12.00, 27.00, NULL, NULL, NULL, 1180.44, 1876.90, DATE '2026-10-01'),

    ('COLECTIVO', 'PROVINCIA',  0.00,  3.00, NULL, NULL, NULL, 1215.09, 2430.18, DATE '2026-10-01'),
    ('COLECTIVO', 'PROVINCIA',  3.00,  6.00, NULL, NULL, NULL, 1366.97, 2733.94, DATE '2026-10-01'),
    ('COLECTIVO', 'PROVINCIA',  6.00, 12.00, NULL, NULL, NULL, 1518.85, 3037.70, DATE '2026-10-01'),
    ('COLECTIVO', 'PROVINCIA', 12.00, 27.00, NULL, NULL, NULL, 1822.63, 3645.26, DATE '2026-10-01'),
    ('COLECTIVO', 'PROVINCIA', 27.00,  NULL, NULL, NULL, NULL, 2142.81, 4285.62, DATE '2026-10-01');
