-- Se saca la deteccion de "subte sin servicio" por el pronostico vacio y las
-- noticias de paro: daba falsos avisos (la H "sin servicio" un viernes a la
-- manana). Las alertas que guardo quedan inactivas; las del subte vuelven a
-- salir solo de la API Transporte de la Ciudad.
UPDATE alert SET active = false WHERE source = 'Pronóstico en vivo (API Transporte GCBA)' AND active;
