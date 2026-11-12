-- Los avisos de los trenes ya no se leen de la pagina "Modificaciones en el
-- servicio y novedades": las alertas salen de la API de Trenes. Se dan de baja
-- los avisos de la pagina que quedaron guardados (no se borran: el historial
-- y las estadisticas los siguen contando).
UPDATE alert
SET active = false
WHERE source = 'Trenes Argentinos'
  AND external_id LIKE 'trenes-ar:%'
  AND active = true;
