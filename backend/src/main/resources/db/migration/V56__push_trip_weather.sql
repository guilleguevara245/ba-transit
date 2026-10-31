-- Avisos: "El clima y tu viaje". trip_weather_time: a que hora mandarlo
-- ("07:00", hora de Buenos Aires), de lunes a viernes y solo los dias con
-- lluvia, tormenta, calor, frio o viento fuerte en Casa o Trabajo.
-- null = apagado.
ALTER TABLE push_subscription
    ADD COLUMN trip_weather_time VARCHAR(5);
