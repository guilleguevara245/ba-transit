-- Informacion institucional de cada linea, para el recuadro debajo del
-- minimapa en el detalle de linea.
--
-- Operadores verificados a octubre de 2026:
--   * Subte y Premetro: Emova Movilidad (Grupo Roggio), concesionaria de
--     Subterraneos de Buenos Aires (SBASE).
--   * Urquiza: Metrovias, concesion privada prorrogada hasta el
--     30/06/2027 (Diario Anticipos, 18/05/2026).
--   * Belgrano Norte: Ferrovias, concesion privada.
--   * Resto de los trenes: Trenes Argentinos Operaciones (SOFSE), empresa
--     estatal, con un proceso de reprivatizacion en curso.
-- historic_name: nombre del ferrocarril que da origen a cada linea.
-- opened_year: solo se carga donde el dato es seguro (subte y premetro).

ALTER TABLE transport_line ADD COLUMN operator VARCHAR(100);
ALTER TABLE transport_line ADD COLUMN operator_type VARCHAR(100);
ALTER TABLE transport_line ADD COLUMN historic_name VARCHAR(100);
ALTER TABLE transport_line ADD COLUMN opened_year INTEGER;

UPDATE transport_line SET operator = 'Emova Movilidad', operator_type = 'Concesión de SBASE (Ciudad de Buenos Aires)'
WHERE mode IN ('SUBTE', 'PREMETRO');

UPDATE transport_line SET opened_year = 1913 WHERE mode = 'SUBTE' AND code = 'A';
UPDATE transport_line SET opened_year = 1930 WHERE mode = 'SUBTE' AND code = 'B';
UPDATE transport_line SET opened_year = 1934 WHERE mode = 'SUBTE' AND code = 'C';
UPDATE transport_line SET opened_year = 1937 WHERE mode = 'SUBTE' AND code = 'D';
UPDATE transport_line SET opened_year = 1944 WHERE mode = 'SUBTE' AND code = 'E';
UPDATE transport_line SET opened_year = 2007 WHERE mode = 'SUBTE' AND code = 'H';
UPDATE transport_line SET opened_year = 1987 WHERE mode = 'PREMETRO';

UPDATE transport_line SET operator = 'Trenes Argentinos Operaciones', operator_type = 'Empresa estatal (SOFSE)'
WHERE mode = 'TREN' AND code IN ('MITRE', 'SARMIENTO', 'ROCA', 'SAN_MARTIN', 'BELGRANO_SUR', 'TREN_DE_LA_COSTA');
UPDATE transport_line SET operator = 'Metrovías', operator_type = 'Concesión privada'
WHERE mode = 'TREN' AND code = 'URQUIZA';
UPDATE transport_line SET operator = 'Ferrovías', operator_type = 'Concesión privada'
WHERE mode = 'TREN' AND code = 'BELGRANO_NORTE';

UPDATE transport_line SET historic_name = 'Ferrocarril General Bartolomé Mitre' WHERE mode = 'TREN' AND code = 'MITRE';
UPDATE transport_line SET historic_name = 'Ferrocarril Domingo Faustino Sarmiento' WHERE mode = 'TREN' AND code = 'SARMIENTO';
UPDATE transport_line SET historic_name = 'Ferrocarril General Roca' WHERE mode = 'TREN' AND code = 'ROCA';
UPDATE transport_line SET historic_name = 'Ferrocarril General San Martín' WHERE mode = 'TREN' AND code = 'SAN_MARTIN';
UPDATE transport_line SET historic_name = 'Ferrocarril General Belgrano' WHERE mode = 'TREN' AND code IN ('BELGRANO_NORTE', 'BELGRANO_SUR');
UPDATE transport_line SET historic_name = 'Ferrocarril General Urquiza' WHERE mode = 'TREN' AND code = 'URQUIZA';
