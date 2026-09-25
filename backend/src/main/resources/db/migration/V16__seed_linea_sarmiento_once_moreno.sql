-- Ramal principal (electrico) Once - Moreno. Se excluyen a proposito
-- los ramales dieselregionales Moreno-Mercedes y Merlo-Lobos, de menor
-- frecuencia, para una etapa posterior.
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Once - Moreno' FROM transport_line WHERE mode = 'TREN' AND code = 'SARMIENTO';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Once', 1),
    ('Caballito', 2),
    ('Flores', 3),
    ('Floresta', 4),
    ('Villa Luro', 5),
    ('Liniers', 6),
    ('Ciudadela', 7),
    ('Ramos Mejía', 8),
    ('Haedo', 9),
    ('Morón', 10),
    ('Castelar', 11),
    ('Ituzaingó', 12),
    ('San Antonio de Padua', 13),
    ('Merlo', 14),
    ('Paso del Rey', 15),
    ('Moreno', 16)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'SARMIENTO' AND br.name = 'Once - Moreno';
