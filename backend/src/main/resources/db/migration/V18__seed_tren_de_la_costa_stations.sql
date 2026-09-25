INSERT INTO branch (transport_line_id, name)
SELECT id, 'Maipú - Delta' FROM transport_line WHERE mode = 'TREN' AND code = 'TREN_DE_LA_COSTA';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Maipú', 1),
    ('Borges', 2),
    ('Libertador', 3),
    ('Anchorena', 4),
    ('Barrancas', 5),
    ('San Isidro', 6),
    ('Punta Chica', 7),
    ('Marina Nueva', 8),
    ('San Fernando', 9),
    ('Canal', 10),
    ('Delta', 11)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'TREN_DE_LA_COSTA' AND br.name = 'Maipú - Delta';
