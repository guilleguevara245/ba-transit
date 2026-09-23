-- Ramal urbano (AMBA) de la Linea San Martin. Se excluyen a proposito los
-- servicios de larga distancia (Junin, Rufino), fuera del alcance del proyecto.
INSERT INTO branch (transport_line_id, name)
SELECT id, 'Retiro - Dr. Cabred' FROM transport_line WHERE mode = 'TREN' AND code = 'SAN_MARTIN';

INSERT INTO station (branch_id, name, sequence_order)
SELECT br.id, s.name, s.sequence_order
FROM branch br
JOIN transport_line tl ON br.transport_line_id = tl.id
CROSS JOIN (VALUES
    ('Retiro', 1),
    ('Palermo', 2),
    ('Chacarita', 3),
    ('La Paternal', 4),
    ('Villa del Parque', 5),
    ('Devoto', 6),
    ('Sáenz Peña', 7),
    ('Santos Lugares', 8),
    ('Caseros', 9),
    ('El Palomar', 10),
    ('Hurlingham', 11),
    ('William Morris', 12),
    ('Bella Vista', 13),
    ('Muñiz', 14),
    ('San Miguel', 15),
    ('José C. Paz', 16),
    ('Sol y Verde', 17),
    ('Presidente Derqui', 18),
    ('Villa Astolfi', 19),
    ('Pilar', 20),
    ('Manzanares', 21),
    ('Dr. Cabred', 22)
) AS s(name, sequence_order)
WHERE tl.mode = 'TREN' AND tl.code = 'SAN_MARTIN' AND br.name = 'Retiro - Dr. Cabred';
