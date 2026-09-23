INSERT INTO branch (transport_line_id, name)
SELECT id, 'Federico Lacroze - General Lemos' FROM transport_line WHERE mode = 'TREN' AND code = 'URQUIZA';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Federico Lacroze', 1),
    ('Artigas', 2),
    ('Arata', 3),
    ('Francisco Beiró', 4),
    ('El Libertador', 5),
    ('Devoto', 6),
    ('Lynch', 7),
    ('F. Moreno', 8),
    ('Lourdes', 9),
    ('Tropezón', 10),
    ('J. M. Bosch', 11),
    ('Martín Coronado', 12),
    ('Pablo Podestá', 13),
    ('Jorge Newbery', 14),
    ('Rubén Darío', 15),
    ('Ejército de los Andes', 16),
    ('Lasalle', 17),
    ('Sargento Barrufaldi', 18),
    ('Capitán Lozano', 19),
    ('Teniente Agneta', 20),
    ('Campo de Mayo', 21),
    ('Sargento Cabral', 22),
    ('General Lemos', 23)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'URQUIZA' AND br.name = 'Federico Lacroze - General Lemos';
