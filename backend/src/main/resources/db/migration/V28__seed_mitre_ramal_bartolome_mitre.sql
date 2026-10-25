-- Ramal Retiro - Bartolome Mitre de la linea Mitre, que faltaba cargar.
-- Comparte con el ramal Jose L. Suarez el tramo Retiro - Belgrano R y
-- despues sigue por Coghlan y Saavedra hasta Bartolome Mitre (Olivos).
-- Coordenadas: Buenos Aires Data, "Estaciones de ferrocarril".

INSERT INTO branch (transport_line_id, name)
SELECT id, 'Retiro - Bartolomé Mitre' FROM transport_line WHERE mode = 'TREN' AND code = 'MITRE';

INSERT INTO station (branch_id, name, sequence_order, latitude, longitude)
SELECT b.id, s.name, s.sequence_order, s.latitude, s.longitude
FROM branch b
JOIN transport_line tl ON tl.id = b.transport_line_id
CROSS JOIN (VALUES
    ('Retiro', 1, -34.5908120, -58.3751229),
    ('3 de Febrero', 2, -34.5718756, -58.4252159),
    ('Ministro Carranza', 3, -34.5756112, -58.4349666),
    ('Colegiales', 4, -34.5730243, -58.4481920),
    ('Belgrano R', 5, -34.5677887, -58.4624501),
    ('Coghlan', 6, -34.5653596, -58.4751549),
    ('Saavedra', 7, -34.5544285, -58.4868153),
    ('Juan B. Justo', 8, -34.5425418, -58.4946618),
    ('Florida', 9, -34.5301526, -58.4944222),
    ('Cetrángolo', 10, -34.5231353, -58.4941321),
    ('Bartolomé Mitre', 11, -34.5150196, -58.4892241)
) AS s (name, sequence_order, latitude, longitude)
WHERE tl.mode = 'TREN' AND tl.code = 'MITRE' AND b.name = 'Retiro - Bartolomé Mitre';
