-- Se excluye a proposito el ramal Puente Alsina - Aldo Bonzi: esta
-- confirmado que actualmente NO esta en servicio. Tambien se excluye la
-- extension Gonzalez Catan - Lozano, fuera del alcance AMBA definido.

-- Ramal Dr. A. Saenz - Gonzalez Catan (13 estaciones)
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Dr. A. Sáenz - González Catán' FROM transport_line WHERE mode = 'TREN' AND code = 'BELGRANO_SUR';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Dr. A. Sáenz', 1),
    ('Villa Soldati', 2),
    ('Presidente Illia', 3),
    ('Lugano', 4),
    ('Villa Madero', 5),
    ('M. del Fournier', 6),
    ('Tapiales', 7),
    ('Ing. Castello', 8),
    ('Querandí', 9),
    ('Laferrere', 10),
    ('M. Eva Duarte', 11),
    ('Independencia', 12),
    ('González Catán', 13)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'BELGRANO_SUR' AND br.name = 'Dr. A. Sáenz - González Catán';

-- Ramal Dr. A. Saenz - Marinos del Crucero Gral. Belgrano (16 estaciones)
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Dr. A. Sáenz - Marinos del Crucero Gral. Belgrano' FROM transport_line WHERE mode = 'TREN' AND code = 'BELGRANO_SUR';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Dr. A. Sáenz', 1),
    ('Villa Soldati', 2),
    ('Presidente Illia', 3),
    ('Lugano', 4),
    ('Villa Madero', 5),
    ('M. del Fournier', 6),
    ('Tapiales', 7),
    ('Aldo Bonzi', 8),
    ('Mendeville', 9),
    ('José Ingenieros', 10),
    ('J. Villegas', 11),
    ('Isidro Casanova', 12),
    ('Rafael Castillo', 13),
    ('Merlo Gómez', 14),
    ('Libertad', 15),
    ('Marinos del Crucero Gral. Belgrano', 16)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'BELGRANO_SUR' AND br.name = 'Dr. A. Sáenz - Marinos del Crucero Gral. Belgrano';
