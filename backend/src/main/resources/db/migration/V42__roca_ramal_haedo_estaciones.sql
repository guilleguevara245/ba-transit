-- Linea Roca, ajustes con el dataset del IGN "Estaciones del sistema
-- ferroviario en la provincia" (estaciones activas, fuente Trenes
-- Argentinos):
--  * Temperley - Haedo: faltaban Km 34 y P. P. Turner, entre Juan XXIII y
--    Agustin de Elia (Km 34 figura tambien en el horario oficial del ramal).
--  * Ricardo Levene (Ezeiza - Canuelas): la ubicacion anterior estaba a unos
--    800 m de la estacion; se usa la del IGN.

-- Se corre el orden en dos pasos para no chocar con la clave unica (ramal, orden).
UPDATE station SET sequence_order = sequence_order + 1000
WHERE sequence_order > 4
  AND branch_id = (SELECT b.id FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
                   WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND b.name = 'Temperley - Haedo');
UPDATE station SET sequence_order = sequence_order - 998
WHERE sequence_order > 1000
  AND branch_id = (SELECT b.id FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
                   WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND b.name = 'Temperley - Haedo');

INSERT INTO station (branch_id, name, sequence_order, latitude, longitude)
SELECT b.id, s.name, s.seq, s.lat, s.lon
FROM branch b
JOIN transport_line tl ON tl.id = b.transport_line_id
CROSS JOIN (VALUES
    ('Km 34',        5, -34.7435025, -58.4650750),
    ('P. P. Turner', 6, -34.7336819, -58.4741846)
) AS s(name, seq, lat, lon)
WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND b.name = 'Temperley - Haedo';

UPDATE station SET latitude = -35.0218301, longitude = -58.7238931
WHERE name = 'Ricardo Levene'
  AND branch_id = (SELECT b.id FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
                   WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND b.name = 'Ezeiza - Cañuelas');
