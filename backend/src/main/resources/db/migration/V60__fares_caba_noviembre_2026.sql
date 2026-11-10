-- Colectivos de la Ciudad desde el 1 de noviembre de 2026 (+3,9%),
-- segun la Resolucion 231/SECT/2026 de la Secretaria de Transporte de la
-- Ciudad (publicada el 30/10/2026; valores con SUBE registrada informados
-- por Revista Colectibondi y La Ciudad). Red SUBE todavia mostraba los de
-- octubre al 04/11/2026.
--
-- Sin SUBE registrada: el cuadro oficial de la Ciudad usa la tarifa con
-- SUBE registrada por 1,59 (asi da cada valor del cuadro de octubre de
-- Red SUBE); se calculan igual, redondeados al centavo. Revisar contra Red
-- SUBE cuando la actualice.

UPDATE fare
SET active = FALSE
WHERE active
  AND effective_from < DATE '2026-11-01'
  AND mode = 'COLECTIVO'
  AND jurisdiction = 'CABA';

INSERT INTO fare (mode, jurisdiction, min_km, max_km, section, trips_from, trips_to, price, price_unregistered,
                  effective_from) VALUES
    ('COLECTIVO', 'CABA',  0.00,  3.00, NULL, NULL, NULL,  956.69, 1521.14, DATE '2026-11-01'),
    ('COLECTIVO', 'CABA',  3.00,  6.00, NULL, NULL, NULL, 1063.04, 1690.23, DATE '2026-11-01'),
    ('COLECTIVO', 'CABA',  6.00, 12.00, NULL, NULL, NULL, 1144.92, 1820.42, DATE '2026-11-01'),
    ('COLECTIVO', 'CABA', 12.00, 27.00, NULL, NULL, NULL, 1226.87, 1950.72, DATE '2026-11-01');
