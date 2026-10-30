-- La estacion Chacarita de la linea San Martin ahora se llama Villa Crespo
-- (estacion elevada nueva, ex Chacarita).
UPDATE station s SET name = 'Villa Crespo'
FROM branch b JOIN transport_line tl ON tl.id = b.transport_line_id
WHERE s.branch_id = b.id AND tl.mode = 'TREN' AND tl.code = 'SAN_MARTIN' AND s.name = 'Chacarita';
