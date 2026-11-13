-- El aviso del horario extendido de la Linea D por la Noche de los Museos reuso
-- el id de una alerta de hace 40 dias y quedo con la fecha de aquella. Desde
-- esta version, una alerta que vuelve o cambia de texto se publica de nuevo;
-- esta ya estaba activa, asi que se corrige a mano.
UPDATE alert
SET published_at = now()
WHERE active
  AND source = 'API Transporte GCBA'
  AND description ILIKE '%horario extendido por la Noche de los Museos%';
