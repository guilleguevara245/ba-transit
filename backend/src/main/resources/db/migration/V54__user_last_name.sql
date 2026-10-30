-- Nombre y apellido por separado: el nombre es el que se usa para saludar.
-- Las cuentas que ya existen se separan en el primer espacio
-- ("Guillermo Guevara" -> "Guillermo" y "Guevara"); se puede corregir en Tu cuenta.
ALTER TABLE app_user ADD COLUMN last_name VARCHAR(80);

UPDATE app_user
SET last_name = NULLIF(btrim(substring(btrim(display_name) FROM position(' ' IN btrim(display_name)) + 1)), ''),
    display_name = split_part(btrim(display_name), ' ', 1)
WHERE position(' ' IN btrim(display_name)) > 0;
