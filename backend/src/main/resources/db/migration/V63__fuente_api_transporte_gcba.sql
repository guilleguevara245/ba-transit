-- Las alertas del subte se muestran con la fuente "API Transporte GCBA" (para
-- distinguirla de "API Trenes Argentinos"). Se renombran las ya guardadas,
-- asi la sincronizacion las sigue reconociendo como suyas.
UPDATE alert SET source = 'API Transporte GCBA' WHERE source = 'API Transporte';
