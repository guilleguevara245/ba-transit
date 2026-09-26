-- Se cargan los dos ramales urbanos principales de Mitre. Se excluyen a
-- proposito Victoria-Capilla del Senor y Villa Ballester-Zarate (mas
-- alejados, menor frecuencia), fuera del alcance AMBA de este proyecto.

-- Ramal Retiro - Tigre (17 estaciones)
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Retiro - Tigre' FROM transport_line WHERE mode = 'TREN' AND code = 'MITRE';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Retiro', 1),
    ('Lisandro de la Torre', 2),
    ('Belgrano C', 3),
    ('Núñez', 4),
    ('Rivadavia', 5),
    ('Vicente López', 6),
    ('Olivos', 7),
    ('La Lucila', 8),
    ('Martínez', 9),
    ('Acassuso', 10),
    ('San Isidro C', 11),
    ('Beccar', 12),
    ('Victoria', 13),
    ('Virreyes', 14),
    ('San Fernando C', 15),
    ('Carupá', 16),
    ('Tigre', 17)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'MITRE' AND br.name = 'Retiro - Tigre';

-- Ramal Retiro - José L. Suárez (15 estaciones)
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Retiro - José L. Suárez' FROM transport_line WHERE mode = 'TREN' AND code = 'MITRE';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Retiro', 1),
    ('3 de Febrero', 2),
    ('Ministro Carranza', 3),
    ('Colegiales', 4),
    ('Belgrano R', 5),
    ('L. M. Drago', 6),
    ('General Urquiza', 7),
    ('Pueyrredón', 8),
    ('Miguelete', 9),
    ('San Martín', 10),
    ('San Andrés', 11),
    ('Malaver', 12),
    ('Villa Ballester', 13),
    ('Chilavert', 14),
    ('José L. Suárez', 15)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'MITRE' AND br.name = 'Retiro - José L. Suárez';
