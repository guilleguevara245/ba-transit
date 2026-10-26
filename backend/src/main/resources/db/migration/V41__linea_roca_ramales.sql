-- Linea Roca: hasta ahora solo estaba el ramal Plaza Constitucion - La Plata.
-- Se agregan los demas ramales electricos y diesel del AMBA con servicio:
--   Plaza Constitucion - Ezeiza, - Alejandro Korn, - Bosques (via Temperley),
--   - Bosques (via Quilmes), Temperley - Haedo y Ezeiza - Canuelas.
-- Y la estacion Dario Santillan y Maximiliano Kosteki (Avellaneda), que
-- faltaba en el ramal La Plata (figura en su horario oficial).
--
-- Fuente: datasets de datos.gob.ar "Estaciones de trenes con servicios
-- activos 2022" (ubicacion de cada estacion) y "Red ADIFSE 2022" (trazado
-- de las vias). Cada estacion se asigno al ramal cuyo trazado pasa a menos
-- de 250 m y se ordeno por la distancia recorrida desde la cabecera.
-- Las estaciones que ya existian en el ramal La Plata reutilizan sus datos
-- (coordenadas, accesibilidad, inauguracion y lugares cercanos).

-- 1) Kosteki en el ramal La Plata, entre Constitucion y Sarandi. Se corre
--    el orden en dos pasos para no chocar con la clave unica (ramal, orden).
UPDATE station SET sequence_order = sequence_order + 1000
WHERE sequence_order >= 2
  AND branch_id = (SELECT b.id FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
                   WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND b.name = 'Constitución - La Plata');
UPDATE station SET sequence_order = sequence_order - 999
WHERE sequence_order >= 1000
  AND branch_id = (SELECT b.id FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
                   WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND b.name = 'Constitución - La Plata');

INSERT INTO station (branch_id, name, sequence_order, latitude, longitude)
SELECT b.id, 'Darío Santillán y Maximiliano Kosteki', 2, -34.6619583, -58.3764972
FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND b.name = 'Constitución - La Plata';

-- 2) Ramales nuevos.
INSERT INTO branch (transport_line_id, name)
SELECT tl.id, r.name
FROM transport_line tl
CROSS JOIN (VALUES
    ('Plaza Constitución - Ezeiza'),
    ('Plaza Constitución - Alejandro Korn'),
    ('Plaza Constitución - Bosques (vía Temperley)'),
    ('Plaza Constitución - Bosques (vía Quilmes)'),
    ('Temperley - Haedo'),
    ('Ezeiza - Cañuelas')
) AS r(name)
WHERE tl.mode = 'TREN' AND tl.code = 'ROCA';

CREATE TEMP TABLE roca_ramal (tag VARCHAR(20), name VARCHAR(100), seq INT,
                              lat NUMERIC(10,7), lon NUMERIC(10,7));
INSERT INTO roca_ramal VALUES
    ('ezeiza', 'Plaza Constitución', 1, -34.6286831, -58.3804989),
    ('ezeiza', 'Hipólito Yrigoyen', 2, -34.6535722, -58.3787167),
    ('ezeiza', 'Darío Santillán y Maximiliano Kosteki', 3, -34.6619583, -58.3764972),
    ('ezeiza', 'Gerli', 4, -34.6859333, -58.3827750),
    ('ezeiza', 'Lanús', 5, -34.7072611, -58.3907639),
    ('ezeiza', 'Remedios de Escalada', 6, -34.7268028, -58.3936028),
    ('ezeiza', 'Banfield', 7, -34.7434274, -58.3956792),
    ('ezeiza', 'Lomas de Zamora', 8, -34.7606167, -58.3975556),
    ('ezeiza', 'Temperley', 9, -34.7757143, -58.3966802),
    ('ezeiza', 'Turdera', 10, -34.7950565, -58.4080176),
    ('ezeiza', 'Llavallol', 11, -34.7971450, -58.4300976),
    ('ezeiza', 'Luis Guillón', 12, -34.8033052, -58.4486406),
    ('ezeiza', 'Monte Grande', 13, -34.8144368, -58.4697046),
    ('ezeiza', 'El Jagüel', 14, -34.8332637, -58.4961523),
    ('ezeiza', 'Ezeiza', 15, -34.8540453, -58.5228503),
    ('korn', 'Plaza Constitución', 1, -34.6286831, -58.3804989),
    ('korn', 'Hipólito Yrigoyen', 2, -34.6535722, -58.3787167),
    ('korn', 'Darío Santillán y Maximiliano Kosteki', 3, -34.6619583, -58.3764972),
    ('korn', 'Gerli', 4, -34.6859333, -58.3827750),
    ('korn', 'Lanús', 5, -34.7072611, -58.3907639),
    ('korn', 'Remedios de Escalada', 6, -34.7268028, -58.3936028),
    ('korn', 'Banfield', 7, -34.7434274, -58.3956792),
    ('korn', 'Lomas de Zamora', 8, -34.7606167, -58.3975556),
    ('korn', 'Temperley', 9, -34.7757143, -58.3966802),
    ('korn', 'Adrogué', 10, -34.7978500, -58.3943250),
    ('korn', 'Burzaco', 11, -34.8250583, -58.3912944),
    ('korn', 'Longchamps', 12, -34.8594778, -58.3871556),
    ('korn', 'Glew', 13, -34.8885639, -58.3838722),
    ('korn', 'Guernica', 14, -34.9179528, -58.3806583),
    ('korn', 'Alejandro Korn', 15, -34.9805484, -58.3739267),
    ('bosques_t', 'Plaza Constitución', 1, -34.6286831, -58.3804989),
    ('bosques_t', 'Hipólito Yrigoyen', 2, -34.6535722, -58.3787167),
    ('bosques_t', 'Darío Santillán y Maximiliano Kosteki', 3, -34.6619583, -58.3764972),
    ('bosques_t', 'Gerli', 4, -34.6859333, -58.3827750),
    ('bosques_t', 'Lanús', 5, -34.7072611, -58.3907639),
    ('bosques_t', 'Remedios de Escalada', 6, -34.7268028, -58.3936028),
    ('bosques_t', 'Banfield', 7, -34.7434274, -58.3956792),
    ('bosques_t', 'Lomas de Zamora', 8, -34.7606167, -58.3975556),
    ('bosques_t', 'Temperley', 9, -34.7757143, -58.3966802),
    ('bosques_t', 'José Mármol', 10, -34.7919323, -58.3811390),
    ('bosques_t', 'Rafael Calzada', 11, -34.7967382, -58.3594116),
    ('bosques_t', 'Claypole', 12, -34.8011288, -58.3379054),
    ('bosques_t', 'Ing. Dante Ardigó', 13, -34.8089111, -58.3027182),
    ('bosques_t', 'Florencio Varela', 14, -34.8110101, -58.2746941),
    ('bosques_t', 'Estanislao Zeballos', 15, -34.8109786, -58.2566556),
    ('bosques_t', 'Bosques', 16, -34.8194405, -58.2305280),
    ('bosques_q', 'Plaza Constitución', 1, -34.6286831, -58.3804989),
    ('bosques_q', 'Darío Santillán y Maximiliano Kosteki', 2, -34.6619583, -58.3764972),
    ('bosques_q', 'Sarandí', 3, -34.6787833, -58.3455778),
    ('bosques_q', 'Villa Domínico', 4, -34.6915417, -58.3254417),
    ('bosques_q', 'Wilde', 5, -34.6974836, -58.3111615),
    ('bosques_q', 'Don Bosco', 6, -34.7034195, -58.2961982),
    ('bosques_q', 'Bernal', 7, -34.7094183, -58.2804887),
    ('bosques_q', 'Quilmes', 8, -34.7242694, -58.2607944),
    ('bosques_q', 'Ezpeleta', 9, -34.7518833, -58.2343194),
    ('bosques_q', 'Berazategui', 10, -34.7640306, -58.2088222),
    ('bosques_q', 'Villa España', 11, -34.7742184, -58.1948638),
    ('bosques_q', 'Ranelagh', 12, -34.7893950, -58.2032256),
    ('bosques_q', 'Sourigues', 13, -34.8088442, -58.2139657),
    ('bosques_q', 'Bosques', 14, -34.8194405, -58.2305280),
    ('haedo', 'Temperley', 1, -34.7757143, -58.3966802),
    ('haedo', 'Hospital Español', 2, -34.7862674, -58.4072870),
    ('haedo', 'Santa Catalina', 3, -34.7802876, -58.4374209),
    ('haedo', 'Juan XXIII', 4, -34.7711913, -58.4442269),
    ('haedo', 'Agustín de Elía', 5, -34.7097817, -58.5060791),
    ('haedo', 'La Tablada', 6, -34.6930401, -58.5280936),
    ('haedo', 'San Justo', 7, -34.6737950, -58.5558439),
    ('haedo', 'Ing. S. Brian', 8, -34.6580705, -58.5730352),
    ('haedo', 'Haedo', 9, -34.6444771, -58.5919459),
    ('canuelas', 'Ezeiza', 1, -34.8540453, -58.5228503),
    ('canuelas', 'Unión Ferroviaria', 2, -34.8701848, -58.5432554),
    ('canuelas', 'Tristán Suárez', 3, -34.8893489, -58.5676348),
    ('canuelas', 'Carlos Spegazzini', 4, -34.9096141, -58.5938526),
    ('canuelas', 'Máximo Paz', 5, -34.9363692, -58.6206328),
    ('canuelas', 'Vicente Casares', 6, -34.9622557, -58.6476871),
    ('canuelas', 'Alejandro Petión', 7, -34.9771598, -58.6736678),
    ('canuelas', 'Kloosterman', 8, -34.9880266, -58.6927792),
    ('canuelas', 'Ricardo Levene', 9, -35.0271272, -58.7297660),
    ('canuelas', 'Cañuelas', 10, -35.0593361, -58.7545056);

CREATE TEMP TABLE roca_ramal_nombre (tag VARCHAR(20), branch_name VARCHAR(100));
INSERT INTO roca_ramal_nombre VALUES
    ('ezeiza',    'Plaza Constitución - Ezeiza'),
    ('korn',      'Plaza Constitución - Alejandro Korn'),
    ('bosques_t', 'Plaza Constitución - Bosques (vía Temperley)'),
    ('bosques_q', 'Plaza Constitución - Bosques (vía Quilmes)'),
    ('haedo',     'Temperley - Haedo'),
    ('canuelas',  'Ezeiza - Cañuelas');

INSERT INTO station (branch_id, name, sequence_order, latitude, longitude, opened_on, landmarks, accessible)
SELECT b.id, r.name, r.seq,
       COALESCE(lp.latitude, r.lat), COALESCE(lp.longitude, r.lon),
       lp.opened_on, lp.landmarks, lp.accessible
FROM roca_ramal r
JOIN roca_ramal_nombre n ON n.tag = r.tag
JOIN transport_line tl ON tl.mode = 'TREN' AND tl.code = 'ROCA'
JOIN branch b ON b.transport_line_id = tl.id AND b.name = n.branch_name
LEFT JOIN (
    SELECT s.name, s.latitude, s.longitude, s.opened_on, s.landmarks, s.accessible
    FROM station s
    JOIN branch lb ON lb.id = s.branch_id
    JOIN transport_line ltl ON ltl.id = lb.transport_line_id
    WHERE ltl.mode = 'TREN' AND ltl.code = 'ROCA' AND lb.name = 'Constitución - La Plata'
) lp ON lp.name = r.name;

DROP TABLE roca_ramal;
DROP TABLE roca_ramal_nombre;

-- 3) Mismo formato de nombre para el ramal que ya existia.
UPDATE branch SET name = 'Plaza Constitución - La Plata'
WHERE name = 'Constitución - La Plata'
  AND transport_line_id = (SELECT id FROM transport_line WHERE mode = 'TREN' AND code = 'ROCA');
