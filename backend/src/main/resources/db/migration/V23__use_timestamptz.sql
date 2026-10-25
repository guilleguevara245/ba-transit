-- Las fechas pasan de TIMESTAMP (sin zona horaria) a TIMESTAMPTZ.
--
-- Con TIMESTAMP, el valor guardado dependia de la zona horaria de la
-- sesion (la de la JVM: UTC en Render, America/Buenos_Aires en una PC
-- local), y DEFAULT NOW() hacia lo mismo. Eso puede correr 3 horas los
-- "hace X min" del frontend. TIMESTAMPTZ guarda un instante absoluto,
-- que es exactamente lo que representa java.time.Instant.
--
-- Supuesto para los datos existentes: fueron escritos en UTC (el
-- backend desplegado corre en UTC). En una base local creada desde
-- una JVM en hora argentina, las fechas viejas quedan corridas 3 horas;
-- no afecta a los datos nuevos.

ALTER TABLE transport_line ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
ALTER TABLE branch         ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
ALTER TABLE station        ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
ALTER TABLE fare           ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
ALTER TABLE alert          ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';
ALTER TABLE alert          ALTER COLUMN published_at TYPE TIMESTAMPTZ USING published_at AT TIME ZONE 'UTC';
