-- Tarifas vigentes desde el 1 de noviembre de 2026: subte, Premetro y
-- colectivos de la Provincia. Fuente: Red SUBE,
-- argentina.gob.ar/redsube/tarifas-de-transporte-publico-amba (actualizada
-- el 04/11/2026). El subte sube 3,9% (inflacion de septiembre mas dos
-- puntos) y los colectivos de la Provincia, 5,02%. Los colectivos
-- nacionales y los trenes no cambian. Los de la Ciudad van aparte, en V60.
--
-- Como en V21 y V39: las tarifas anteriores se desactivan (quedan en el
-- historial) y las nuevas se insertan con su fecha.

UPDATE fare
SET active = FALSE
WHERE active
  AND effective_from < DATE '2026-11-01'
  AND (mode IN ('SUBTE', 'PREMETRO') OR (mode = 'COLECTIVO' AND jurisdiction = 'PROVINCIA'));

INSERT INTO fare (mode, jurisdiction, min_km, max_km, section, trips_from, trips_to, price, price_unregistered,
                  effective_from) VALUES
    ('SUBTE', NULL, NULL, NULL, NULL,  1,   20, 1887.00, 2528.58, DATE '2026-11-01'),
    ('SUBTE', NULL, NULL, NULL, NULL, 21,   30, 1509.60, 2528.58, DATE '2026-11-01'),
    ('SUBTE', NULL, NULL, NULL, NULL, 31,   40, 1320.90, 2528.58, DATE '2026-11-01'),
    ('SUBTE', NULL, NULL, NULL, NULL, 41, NULL, 1132.20, 2528.58, DATE '2026-11-01'),

    ('PREMETRO', NULL, NULL, NULL, NULL, NULL, NULL, 660.45, 885.00, DATE '2026-11-01'),

    ('COLECTIVO', 'PROVINCIA',  0.00,  3.00, NULL, NULL, NULL, 1276.06, 2552.12, DATE '2026-11-01'),
    ('COLECTIVO', 'PROVINCIA',  3.00,  6.00, NULL, NULL, NULL, 1435.56, 2871.12, DATE '2026-11-01'),
    ('COLECTIVO', 'PROVINCIA',  6.00, 12.00, NULL, NULL, NULL, 1595.07, 3190.14, DATE '2026-11-01'),
    ('COLECTIVO', 'PROVINCIA', 12.00, 27.00, NULL, NULL, NULL, 1914.09, 3828.18, DATE '2026-11-01'),
    ('COLECTIVO', 'PROVINCIA', 27.00,  NULL, NULL, NULL, NULL, 2250.35, 4500.70, DATE '2026-11-01');
