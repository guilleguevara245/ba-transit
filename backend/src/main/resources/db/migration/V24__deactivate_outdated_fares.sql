-- Deja activas solo las tarifas mas recientes de cada modo.
--
-- Si ya habia tarifas cargadas antes de V21 (por ejemplo, a mano por
-- POST), quedaban activas junto con las nuevas y el panel mostraba
-- precios repetidos. Las anteriores se desactivan (no se borran), asi
-- se conserva el historial. En una base nueva no cambia nada.

UPDATE fare
SET active = FALSE
WHERE active = TRUE
  AND effective_from < (
      SELECT MAX(f2.effective_from)
      FROM fare f2
      WHERE f2.mode = fare.mode
        AND f2.active = TRUE
  );
