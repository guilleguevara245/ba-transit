-- Como en V66: las alertas del subte que sumaron el aviso de la Noche de los
-- Museos cambiaron de texto antes de que una alerta que cambia de texto se
-- publicara de nuevo, y quedaron con la fecha de la alerta vieja (40 dias).
UPDATE alert
SET published_at = now()
WHERE active
  AND source = 'API Transporte GCBA'
  AND description ILIKE '%Noche de los Museos%'
  AND published_at < now() - interval '1 day';
