-- Columnas normalizadas para la busqueda: en minusculas y sin tildes,
-- asi "peru" encuentra "Perú" y "saenz" encuentra "Sáenz Peña".
--
-- Se usa translate() en vez de la extension unaccent porque translate
-- es IMMUTABLE (requisito de las columnas GENERATED) y no necesita
-- permisos para crear extensiones (Neon, CI). Cubre los caracteres
-- del castellano, que son los que aparecen en los nombres cargados.
-- La aplicacion normaliza el texto buscado de la misma forma
-- (ver SearchService.normalize).

ALTER TABLE station
    ADD COLUMN search_name VARCHAR(100)
    GENERATED ALWAYS AS (lower(translate(name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))) STORED;

ALTER TABLE transport_line
    ADD COLUMN search_name VARCHAR(100)
    GENERATED ALWAYS AS (lower(translate(name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))) STORED;
