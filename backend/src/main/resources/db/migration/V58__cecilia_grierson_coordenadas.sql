-- Coordenadas de Cecilia Grierson (Belgrano Norte, La Lonja, Pilar),
-- inaugurada en 2024 entre Del Viso y Villa Rosa. No figura en el dataset
-- de estaciones de la Ciudad que se uso en V27, asi que quedaba fuera del
-- mapa y la linea contaba 22 estaciones en vez de 23. Ubicacion tomada del
-- anden en Google Maps.
UPDATE station s SET latitude = -34.4393070, longitude = -58.8240500
FROM branch b, transport_line tl
WHERE s.branch_id = b.id AND b.transport_line_id = tl.id
  AND tl.mode = 'TREN' AND tl.code = 'BELGRANO_NORTE' AND s.name = 'Cecilia Grierson';
