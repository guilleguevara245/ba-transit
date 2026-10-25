-- Colores de las lineas de tren segun el color de sus formaciones,
-- reemplazando los valores provisorios de V25.
-- San Martin, Sarmiento, Belgrano Norte y Urquiza: confirmados.
-- Mitre, Roca, Belgrano Sur y Tren de la Costa: pendientes de confirmar.

UPDATE transport_line SET color_hex = '#0033A0' WHERE mode = 'TREN' AND code = 'SAN_MARTIN';
UPDATE transport_line SET color_hex = '#5BC2E7' WHERE mode = 'TREN' AND code = 'SARMIENTO';
UPDATE transport_line SET color_hex = '#D52B1E' WHERE mode = 'TREN' AND code = 'BELGRANO_NORTE';
UPDATE transport_line SET color_hex = '#F2C200' WHERE mode = 'TREN' AND code = 'URQUIZA';
