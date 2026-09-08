INSERT INTO station (transport_line_id, name, sequence_order)
SELECT tl.id, s.name, s.sequence_order
FROM transport_line tl
CROSS JOIN (VALUES
    ('Plaza de Mayo', 1),
    ('Perú', 2),
    ('Piedras', 3),
    ('Lima', 4),
    ('Sáenz Peña', 5),
    ('Congreso', 6),
    ('Pasco', 7),
    ('Alberti', 8),
    ('Plaza Miserere', 9),
    ('Loria', 10),
    ('Castro Barros', 11),
    ('Río de Janeiro', 12),
    ('Acoyte', 13),
    ('Primera Junta', 14),
    ('Puán', 15),
    ('Carabobo', 16),
    ('San José de Flores', 17),
    ('San Pedrito', 18)
) AS s(name, sequence_order)
WHERE tl.mode = 'SUBTE' AND tl.code = 'A';
