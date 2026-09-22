ALTER TABLE station ADD COLUMN latitude NUMERIC(10, 7);
ALTER TABLE station ADD COLUMN longitude NUMERIC(10, 7);

-- Coordenadas reales, fuente: Buenos Aires Data - "Estaciones de Subte (GeoJSON)"
-- (data.buenosaires.gob.ar/dataset/subte-estaciones). Cada UPDATE esta
-- acotado por linea + nombre para evitar cualquier cruce incorrecto
-- entre estaciones de distintas lineas que compartan nombre (ej. "Pueyrredon"
-- existe en la B y en la D con coordenadas distintas).

-- Linea A
UPDATE station s SET latitude = -34.6088093, longitude = -58.3709727 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Plaza de Mayo';
UPDATE station s SET latitude = -34.6085581, longitude = -58.3742718 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Perú';
UPDATE station s SET latitude = -34.6088807, longitude = -58.3790890 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Piedras';
UPDATE station s SET latitude = -34.6090988, longitude = -58.3822361 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Lima';
UPDATE station s SET latitude = -34.6094116, longitude = -58.3867807 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Sáenz Peña';
UPDATE station s SET latitude = -34.6092248, longitude = -58.3926721 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Congreso';
UPDATE station s SET latitude = -34.6096451, longitude = -58.3984300 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Pasco';
UPDATE station s SET latitude = -34.6098327, longitude = -58.4012104 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Alberti';
UPDATE station s SET latitude = -34.6098164, longitude = -58.4067098 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Plaza Miserere';
UPDATE station s SET latitude = -34.6107809, longitude = -58.4151880 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Loria';
UPDATE station s SET latitude = -34.6117694, longitude = -58.4218177 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Castro Barros';
UPDATE station s SET latitude = -34.6152047, longitude = -58.4295020 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Río de Janeiro';
UPDATE station s SET latitude = -34.6182791, longitude = -58.4364299 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Acoyte';
UPDATE station s SET latitude = -34.6204043, longitude = -58.4411788 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Primera Junta';
UPDATE station s SET latitude = -34.6235280, longitude = -58.4486485 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Puán';
UPDATE station s SET latitude = -34.6266656, longitude = -58.4567102 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'Carabobo';
UPDATE station s SET latitude = -34.6290862, longitude = -58.4635407 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'San José de Flores';
UPDATE station s SET latitude = -34.6307061, longitude = -58.4696395 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'A' AND s.name = 'San Pedrito';

-- Linea B
UPDATE station s SET latitude = -34.6029886, longitude = -58.3699341 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Leandro N. Alem';
UPDATE station s SET latitude = -34.6032964, longitude = -58.3750756 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Florida';
UPDATE station s SET latitude = -34.6036363, longitude = -58.3807187 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Carlos Pellegrini';
UPDATE station s SET latitude = -34.6040927, longitude = -58.3872997 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Uruguay';
UPDATE station s SET latitude = -34.6044187, longitude = -58.3923176 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Callao';
UPDATE station s SET latitude = -34.6046422, longitude = -58.3994773 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Pasteur';
UPDATE station s SET latitude = -34.6045803, longitude = -58.4054022 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Pueyrredón';
UPDATE station s SET latitude = -34.6040788, longitude = -58.4117651 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Carlos Gardel';
UPDATE station s SET latitude = -34.6031643, longitude = -58.4209646 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Medrano';
UPDATE station s SET latitude = -34.6021617, longitude = -58.4312756 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Ángel Gallardo';
UPDATE station s SET latitude = -34.5989669, longitude = -58.4397729 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Malabia';
UPDATE station s SET latitude = -34.5917179, longitude = -58.4475742 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Dorrego';
UPDATE station s SET latitude = -34.5871977, longitude = -58.4550301 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Federico Lacroze';
UPDATE station s SET latitude = -34.5840946, longitude = -58.4662276 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Tronador - Villa Ortúzar';
UPDATE station s SET latitude = -34.5812490, longitude = -58.4742409 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'De los Incas - Parque Chas';
UPDATE station s SET latitude = -34.5777976, longitude = -58.4810133 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Echeverría';
UPDATE station s SET latitude = -34.5743193, longitude = -58.4863849 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'B' AND s.name = 'Juan Manuel de Rosas';

-- Linea C
UPDATE station s SET latitude = -34.5911932, longitude = -58.3740224 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'Retiro';
UPDATE station s SET latitude = -34.5950567, longitude = -58.3778231 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'General San Martín';
UPDATE station s SET latitude = -34.6017691, longitude = -58.3781597 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'Lavalle';
UPDATE station s SET latitude = -34.6048429, longitude = -58.3795338 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'Diagonal Norte';
UPDATE station s SET latitude = -34.6089823, longitude = -58.3806145 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'Avenida de Mayo';
UPDATE station s SET latitude = -34.6126162, longitude = -58.3804482 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'Moreno';
UPDATE station s SET latitude = -34.6181244, longitude = -58.3801773 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'Independencia';
UPDATE station s SET latitude = -34.6219155, longitude = -58.3799249 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'San Juan';
UPDATE station s SET latitude = -34.6276181, longitude = -58.3814380 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'C' AND s.name = 'Constitución';

-- Linea D
UPDATE station s SET latitude = -34.6078014, longitude = -58.3739599 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Catedral';
UPDATE station s SET latitude = -34.6042443, longitude = -58.3805782 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = '9 de Julio';
UPDATE station s SET latitude = -34.6015864, longitude = -58.3851460 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Tribunales';
UPDATE station s SET latitude = -34.5996389, longitude = -58.3931285 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Callao';
UPDATE station s SET latitude = -34.5997564, longitude = -58.3979269 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Facultad de Medicina';
UPDATE station s SET latitude = -34.5944252, longitude = -58.4023983 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Pueyrredón';
UPDATE station s SET latitude = -34.5916274, longitude = -58.4071641 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Agüero';
UPDATE station s SET latitude = -34.5882368, longitude = -58.4112965 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Bulnes';
UPDATE station s SET latitude = -34.5851557, longitude = -58.4159579 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Scalabrini Ortiz';
UPDATE station s SET latitude = -34.5814111, longitude = -58.4211983 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Plaza Italia';
UPDATE station s SET latitude = -34.5784220, longitude = -58.4257135 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Palermo';
UPDATE station s SET latitude = -34.5751784, longitude = -58.4350153 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Ministro Carranza';
UPDATE station s SET latitude = -34.5700125, longitude = -58.4446695 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Olleros';
UPDATE station s SET latitude = -34.5662156, longitude = -58.4521267 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'José Hernández';
UPDATE station s SET latitude = -34.5623096, longitude = -58.4564901 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Juramento';
UPDATE station s SET latitude = -34.5556424, longitude = -58.4623791 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'D' AND s.name = 'Congreso de Tucumán';

-- Linea E
UPDATE station s SET latitude = -34.5921766, longitude = -58.3757246 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Retiro';
UPDATE station s SET latitude = -34.5966230, longitude = -58.3716692 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Catalinas';
UPDATE station s SET latitude = -34.6031106, longitude = -58.3705611 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Correo Central';
UPDATE station s SET latitude = -34.6092414, longitude = -58.3736883 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Bolívar';
UPDATE station s SET latitude = -34.6128480, longitude = -58.3775848 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Belgrano';
UPDATE station s SET latitude = -34.6179362, longitude = -58.3815386 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Independencia';
UPDATE station s SET latitude = -34.6223382, longitude = -58.3851520 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'San José';
UPDATE station s SET latitude = -34.6227184, longitude = -58.3915149 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Entre Ríos';
UPDATE station s SET latitude = -34.6231087, longitude = -58.3970711 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Pichincha';
UPDATE station s SET latitude = -34.6238645, longitude = -58.4029393 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Jujuy';
UPDATE station s SET latitude = -34.6246526, longitude = -58.4093932 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'General Urquiza';
UPDATE station s SET latitude = -34.6253649, longitude = -58.4155350 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Boedo';
UPDATE station s SET latitude = -34.6270143, longitude = -58.4267907 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Avenida La Plata';
UPDATE station s SET latitude = -34.6280164, longitude = -58.4338177 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'José María Moreno';
UPDATE station s SET latitude = -34.6310407, longitude = -58.4421717 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Emilio Mitre';
UPDATE station s SET latitude = -34.6363879, longitude = -58.4502789 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Medalla Milagrosa';
UPDATE station s SET latitude = -34.6401361, longitude = -58.4578921 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Varela';
UPDATE station s SET latitude = -34.6433108, longitude = -58.4616519 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'E' AND s.name = 'Plaza de los Virreyes - Eva Perón';

-- Linea H
UPDATE station s SET latitude = -34.6412674, longitude = -58.4123874 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Hospitales';
UPDATE station s SET latitude = -34.6384045, longitude = -58.4057973 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Parque Patricios';
UPDATE station s SET latitude = -34.6357487, longitude = -58.3989304 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Caseros';
UPDATE station s SET latitude = -34.6293743, longitude = -58.4009723 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Inclán';
UPDATE station s SET latitude = -34.6230911, longitude = -58.4023255 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Humberto I';
UPDATE station s SET latitude = -34.6152412, longitude = -58.4047344 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Venezuela';
UPDATE station s SET latitude = -34.6089344, longitude = -58.4060391 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Once - 30 de Diciembre';
UPDATE station s SET latitude = -34.6044895, longitude = -58.4054531 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Corrientes';
UPDATE station s SET latitude = -34.5984545, longitude = -58.4037244 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Córdoba';
UPDATE station s SET latitude = -34.5943850, longitude = -58.4023256 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Santa Fe';
UPDATE station s SET latitude = -34.5874612, longitude = -58.3972188 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Las Heras';
UPDATE station s SET latitude = -34.5830360, longitude = -58.3910224 FROM branch b, transport_line tl WHERE s.branch_id = b.id AND b.transport_line_id = tl.id AND tl.mode = 'SUBTE' AND tl.code = 'H' AND s.name = 'Facultad de Derecho';

-- Verificacion de integridad: si algun nombre no matcheo (por una tilde
-- o variante que se nos haya escapado), esto frena la migracion entera
-- en vez de dejar estaciones sin coordenadas en silencio.
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM station s
    JOIN branch b ON s.branch_id = b.id
    JOIN transport_line tl ON b.transport_line_id = tl.id
    WHERE tl.mode = 'SUBTE' AND (s.latitude IS NULL OR s.longitude IS NULL);

    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Quedaron % estaciones de subte sin coordenadas asignadas', missing_count;
    END IF;
END $$;
