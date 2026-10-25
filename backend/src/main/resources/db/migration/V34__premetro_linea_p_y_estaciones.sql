-- Premetro: pasa a llamarse Linea P y se cargan sus 18 estaciones.
-- Recorrido principal Intendente Saguier - General Savio y ramal a
-- Centro Civico Lugano, que se separa despues de Pola.
-- Coordenadas: Wikipedia (articulo de cada estacion). Mariano Acosta y
-- Centro Civico Lugano son aproximadas (Wikipedia no da un dato util).
-- Inauguracion de la linea: 27/08/1987; Fatima (13/03/2000) y Pola
-- (07/11/2006) se agregaron despues.

UPDATE transport_line SET code = 'P', name = 'Premetro (Línea P)' WHERE mode = 'PREMETRO';

UPDATE branch SET name = 'Intendente Saguier - General Savio'
WHERE name = 'Ramal único'
  AND transport_line_id = (SELECT id FROM transport_line WHERE mode = 'PREMETRO');

INSERT INTO branch (transport_line_id, name)
SELECT id, 'Intendente Saguier - Centro Cívico Lugano' FROM transport_line WHERE mode = 'PREMETRO';

-- Tramo comun a los dos ramales (12 estaciones) + el final de cada uno.
CREATE TEMP TABLE premetro_tramo (name VARCHAR(100), seq INT, lat NUMERIC(10,7), lon NUMERIC(10,7),
                                  opened DATE, landmarks VARCHAR(300), ramal VARCHAR(10));
INSERT INTO premetro_tramo VALUES
    ('Intendente Saguier',        1, -34.6458300, -58.4600000, DATE '1987-08-27', NULL, 'comun'),
    ('Balbastro',                 2, -34.6494400, -58.4555600, DATE '1987-08-27', NULL, 'comun'),
    ('Mariano Acosta',            3, -34.6535000, -58.4558000, DATE '1987-08-27', NULL, 'comun'),
    ('Somellera',                 4, -34.6563900, -58.4538900, DATE '1987-08-27', NULL, 'comun'),
    ('Ana María Janer',           5, -34.6594400, -58.4500000, DATE '1987-08-27', NULL, 'comun'),
    ('Nuestra Señora de Fátima',  6, -34.6602800, -58.4488900, DATE '2000-03-13', NULL, 'comun'),
    ('Fernández de la Cruz',      7, -34.6622200, -58.4466700, DATE '1987-08-27', NULL, 'comun'),
    ('Presidente Illia',          8, -34.6652800, -58.4486100, DATE '1987-08-27', NULL, 'comun'),
    ('Parque de la Ciudad',       9, -34.6700000, -58.4550000, DATE '1987-08-27', 'Parque de la Ciudad', 'comun'),
    ('Cecilia Grierson',         10, -34.6719400, -58.4575000, DATE '1987-08-27', NULL, 'comun'),
    ('Escalada',                 11, -34.6744400, -58.4602800, DATE '1987-08-27', NULL, 'comun'),
    ('Pola',                     12, -34.6780600, -58.4644400, DATE '2006-11-07', NULL, 'comun'),
    ('Larrazábal',               13, -34.6805600, -58.4652800, DATE '1987-08-27', NULL, 'savio'),
    ('Nicolás Descalzi',         14, -34.6827800, -58.4625000, DATE '1987-08-27', NULL, 'savio'),
    ('Gabino Ezeiza',            15, -34.6858300, -58.4583300, DATE '1987-08-27', NULL, 'savio'),
    ('General Savio',            16, -34.6894400, -58.4608300, DATE '1987-08-27', NULL, 'savio'),
    ('Ana Díaz',                 13, -34.6806110, -58.4669400, DATE '1987-08-27', NULL, 'lugano'),
    ('Centro Cívico Lugano',     14, -34.6837000, -58.4697000, DATE '1987-08-27', NULL, 'lugano');

INSERT INTO station (branch_id, name, sequence_order, latitude, longitude, opened_on, landmarks)
SELECT b.id, t.name, t.seq, t.lat, t.lon, t.opened, t.landmarks
FROM premetro_tramo t
JOIN transport_line tl ON tl.mode = 'PREMETRO'
JOIN branch b ON b.transport_line_id = tl.id
WHERE (b.name = 'Intendente Saguier - General Savio' AND t.ramal IN ('comun', 'savio'))
   OR (b.name = 'Intendente Saguier - Centro Cívico Lugano' AND t.ramal IN ('comun', 'lugano'));

DROP TABLE premetro_tramo;
