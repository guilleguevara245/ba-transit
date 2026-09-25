-- Ramal principal Constitucion - La Plata. Se excluyen a proposito los
-- demas ramales de Roca (Ezeiza, Alejandro Korn, Bosques, Temperley-Haedo,
-- y los semi-regionales a Canuelas/Lobos/Monte/Chascomus), fuera del
-- alcance definido para este proyecto por ahora.
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Constitución - La Plata' FROM transport_line WHERE mode = 'TREN' AND code = 'ROCA';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Plaza Constitución', 1),
    ('Sarandí', 2),
    ('Villa Domínico', 3),
    ('Wilde', 4),
    ('Don Bosco', 5),
    ('Bernal', 6),
    ('Quilmes', 7),
    ('Ezpeleta', 8),
    ('Berazategui', 9),
    ('Plátanos', 10),
    ('Hudson', 11),
    ('Pereyra', 12),
    ('Villa Elisa', 13),
    ('City Bell', 14),
    ('Gonnet', 15),
    ('Ringuelet', 16),
    ('Tolosa', 17),
    ('La Plata', 18)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'ROCA' AND br.name = 'Constitución - La Plata';
