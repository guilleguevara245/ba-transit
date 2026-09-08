-- Línea B (17 estaciones)
INSERT INTO station (transport_line_id, name, sequence_order)
SELECT tl.id, s.name, s.sequence_order
FROM transport_line tl
CROSS JOIN (VALUES
    ('Leandro N. Alem', 1),
    ('Florida', 2),
    ('Carlos Pellegrini', 3),
    ('Uruguay', 4),
    ('Callao', 5),
    ('Pasteur', 6),
    ('Pueyrredón', 7),
    ('Carlos Gardel', 8),
    ('Medrano', 9),
    ('Ángel Gallardo', 10),
    ('Malabia', 11),
    ('Dorrego', 12),
    ('Federico Lacroze', 13),
    ('Tronador - Villa Ortúzar', 14),
    ('De los Incas - Parque Chas', 15),
    ('Echeverría', 16),
    ('Juan Manuel de Rosas', 17)
) AS s(name, sequence_order)
WHERE tl.mode = 'SUBTE' AND tl.code = 'B';

-- Línea C (9 estaciones)
INSERT INTO station (transport_line_id, name, sequence_order)
SELECT tl.id, s.name, s.sequence_order
FROM transport_line tl
CROSS JOIN (VALUES
    ('Retiro', 1),
    ('General San Martín', 2),
    ('Lavalle', 3),
    ('Diagonal Norte', 4),
    ('Avenida de Mayo', 5),
    ('Moreno', 6),
    ('Independencia', 7),
    ('San Juan', 8),
    ('Constitución', 9)
) AS s(name, sequence_order)
WHERE tl.mode = 'SUBTE' AND tl.code = 'C';

-- Línea D (16 estaciones)
INSERT INTO station (transport_line_id, name, sequence_order)
SELECT tl.id, s.name, s.sequence_order
FROM transport_line tl
CROSS JOIN (VALUES
    ('Catedral', 1),
    ('9 de Julio', 2),
    ('Tribunales', 3),
    ('Callao', 4),
    ('Facultad de Medicina', 5),
    ('Pueyrredón', 6),
    ('Agüero', 7),
    ('Bulnes', 8),
    ('Scalabrini Ortiz', 9),
    ('Plaza Italia', 10),
    ('Palermo', 11),
    ('Ministro Carranza', 12),
    ('Olleros', 13),
    ('José Hernández', 14),
    ('Juramento', 15),
    ('Congreso de Tucumán', 16)
) AS s(name, sequence_order)
WHERE tl.mode = 'SUBTE' AND tl.code = 'D';

-- Línea E (18 estaciones)
INSERT INTO station (transport_line_id, name, sequence_order)
SELECT tl.id, s.name, s.sequence_order
FROM transport_line tl
CROSS JOIN (VALUES
    ('Retiro', 1),
    ('Catalinas', 2),
    ('Correo Central', 3),
    ('Bolívar', 4),
    ('Belgrano', 5),
    ('Independencia', 6),
    ('San José', 7),
    ('Entre Ríos', 8),
    ('Pichincha', 9),
    ('Jujuy', 10),
    ('General Urquiza', 11),
    ('Boedo', 12),
    ('Avenida La Plata', 13),
    ('José María Moreno', 14),
    ('Emilio Mitre', 15),
    ('Medalla Milagrosa', 16),
    ('Varela', 17),
    ('Plaza de los Virreyes - Eva Perón', 18)
) AS s(name, sequence_order)
WHERE tl.mode = 'SUBTE' AND tl.code = 'E';

-- Línea H (12 estaciones)
INSERT INTO station (transport_line_id, name, sequence_order)
SELECT tl.id, s.name, s.sequence_order
FROM transport_line tl
CROSS JOIN (VALUES
    ('Hospitales', 1),
    ('Parque Patricios', 2),
    ('Caseros', 3),
    ('Inclán', 4),
    ('Humberto I', 5),
    ('Venezuela', 6),
    ('Once - 30 de Diciembre', 7),
    ('Corrientes', 8),
    ('Córdoba', 9),
    ('Santa Fe', 10),
    ('Las Heras', 11),
    ('Facultad de Derecho', 12)
) AS s(name, sequence_order)
WHERE tl.mode = 'SUBTE' AND tl.code = 'H';
