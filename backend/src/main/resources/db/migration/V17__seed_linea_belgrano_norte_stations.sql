INSERT INTO branch (transport_line_id, name)
SELECT id, 'Retiro - Villa Rosa' FROM transport_line WHERE mode = 'TREN' AND code = 'BELGRANO_NORTE';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Retiro', 1),
    ('Saldías', 2),
    ('Ciudad Universitaria', 3),
    ('Aristóbulo del Valle', 4),
    ('Padilla', 5),
    ('Florida', 6),
    ('Munro', 7),
    ('Carapachay', 8),
    ('Villa Adelina', 9),
    ('Boulogne', 10),
    ('Vice A. Montes', 11),
    ('Don Torcuato', 12),
    ('A. Sourdeaux', 13),
    ('Villa de Mayo', 14),
    ('Los Polvorines', 15),
    ('Pablo Nogués', 16),
    ('Grand Bourg', 17),
    ('Tierras Altas', 18),
    ('Tortuguitas', 19),
    ('Manuel Alberti', 20),
    ('Del Viso', 21),
    ('Cecilia Grierson', 22),
    ('Villa Rosa', 23)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'BELGRANO_NORTE' AND br.name = 'Retiro - Villa Rosa';
