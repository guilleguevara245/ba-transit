-- Colores definitivos de Mitre, Roca, Tren de la Costa y Belgrano Sur,
-- inspirados en sus formaciones (celeste, blanco y gris; azul en el
-- Belgrano Sur) pero en tonos distintos de Sarmiento (celeste claro) y
-- San Martin (azul fuerte) para que se distingan en el mapa.

UPDATE transport_line SET color_hex = '#1F8FD1' WHERE mode = 'TREN' AND code = 'MITRE';
UPDATE transport_line SET color_hex = '#6E9FB8' WHERE mode = 'TREN' AND code = 'ROCA';
UPDATE transport_line SET color_hex = '#8E9AA3' WHERE mode = 'TREN' AND code = 'TREN_DE_LA_COSTA';
UPDATE transport_line SET color_hex = '#1A2B6D' WHERE mode = 'TREN' AND code = 'BELGRANO_SUR';
