-- Colores identificatorios de las lineas de tren (antes todas tenian el
-- mismo gris). Se usan en el badge de cada linea en el frontend.
-- Valores provisorios: revisar contra el mapa oficial de Trenes
-- Argentinos y corregir en una migracion nueva si hace falta.

UPDATE transport_line SET color_hex = '#0062A6' WHERE mode = 'TREN' AND code = 'MITRE';
UPDATE transport_line SET color_hex = '#00A651' WHERE mode = 'TREN' AND code = 'SARMIENTO';
UPDATE transport_line SET color_hex = '#00A3E0' WHERE mode = 'TREN' AND code = 'ROCA';
UPDATE transport_line SET color_hex = '#F28C00' WHERE mode = 'TREN' AND code = 'SAN_MARTIN';
UPDATE transport_line SET color_hex = '#E3242B' WHERE mode = 'TREN' AND code = 'BELGRANO_SUR';
UPDATE transport_line SET color_hex = '#F2C200' WHERE mode = 'TREN' AND code = 'BELGRANO_NORTE';
UPDATE transport_line SET color_hex = '#7B3F98' WHERE mode = 'TREN' AND code = 'URQUIZA';
UPDATE transport_line SET color_hex = '#8B5E3C' WHERE mode = 'TREN' AND code = 'TREN_DE_LA_COSTA';
