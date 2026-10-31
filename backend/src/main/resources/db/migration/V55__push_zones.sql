-- Avisos: las zonas de quien se suscribe, para mandarle solo las alertas
-- del SMN que lo alcanzan. Formato "casa:-34.60,-58.65;trabajo:-34.55,-58.45"
-- (Casa, Trabajo y la zona del clima), redondeadas a la grilla de 0,05
-- grados: unos 5 km, nunca el punto exacto. null = sin zonas (todo el AMBA).
ALTER TABLE push_subscription
    ADD COLUMN zones VARCHAR(120);
