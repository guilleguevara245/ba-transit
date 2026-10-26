-- Estaciones de subte que Emova informa como accesibles (pagina
-- "Informacion de las estaciones", consultada el 25/10/2026). NULL = sin
-- dato: que Emova no la marque no confirma que no sea accesible.
ALTER TABLE station ADD COLUMN accessible BOOLEAN;

UPDATE station s SET accessible = TRUE
FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
WHERE s.branch_id = b.id AND tl.mode = 'SUBTE' AND (tl.code, s.name) IN (
    ('A', 'Plaza de Mayo'), ('A', 'Perú'), ('A', 'Congreso'),
    ('B', 'Uruguay'), ('B', 'Callao'), ('B', 'Tronador - Villa Ortúzar'), ('B', 'De los Incas - Parque Chas'),
    ('B', 'Echeverría'), ('B', 'Juan Manuel de Rosas'),
    ('D', 'Catedral'), ('D', 'Tribunales'), ('D', 'Callao'), ('D', 'Facultad de Medicina'), ('D', 'Juramento'),
    ('D', 'Congreso de Tucumán'),
    ('E', 'Retiro'), ('E', 'Catalinas'), ('E', 'Correo Central'),
    ('H', 'Facultad de Derecho'), ('H', 'Las Heras'), ('H', 'Santa Fe'), ('H', 'Córdoba'), ('H', 'Corrientes'),
    ('H', 'Once - 30 de Diciembre'), ('H', 'Venezuela'), ('H', 'Humberto I'), ('H', 'Inclán'), ('H', 'Caseros'),
    ('H', 'Parque Patricios'), ('H', 'Hospitales')
);
