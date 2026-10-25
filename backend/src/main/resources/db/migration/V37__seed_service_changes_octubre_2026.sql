-- Cambios en el servicio publicados por Trenes Argentinos en
-- "Modificaciones en el servicio y novedades" (pagina actualizada el
-- 23/10/2026). Cuando una novedad no tiene fecha de fin queda vigente
-- hasta darla de baja con DELETE /api/v1/servicios-especiales/{id}.

INSERT INTO special_service (transport_line_id, kind, title, description, days, schedule, valid_from, valid_until, url)
SELECT tl.id, v.kind, v.title, v.description, v.days, v.schedule, v.valid_from, v.valid_until, v.url
FROM (VALUES
    ('MITRE', 'CAMBIO', 'Ramal Tigre interrumpido',
     'Sin servicio entre Retiro y Tigre por renovación de vías entre Maldonado y Tigre.',
     'Sábado 24 y domingo 25 de octubre', NULL, DATE '2026-10-24', DATE '2026-10-25',
     'https://www.argentina.gob.ar/sites/default/files/alternativas_de_viaje_lm_final_v3.pdf'),
    ('MITRE', 'CAMBIO', 'Ramales J. L. Suárez y Bartolomé Mitre limitados',
     'Por obras, los trenes circulan solo entre Belgrano R y J. L. Suárez y entre Belgrano R y Bartolomé Mitre.',
     'Sábado 24 y domingo 25 de octubre', NULL, DATE '2026-10-24', DATE '2026-10-25',
     'https://www.argentina.gob.ar/sites/default/files/alternativas_de_viaje_lm_final_v3.pdf'),
    ('ROCA', 'CAMBIO', 'Temperley – Haedo: un solo andén',
     'Entre Hospital Español y La Tablada los trenes paran solo en el andén 2 por obras en la zona de vías.',
     NULL, NULL, DATE '2026-10-23', DATE '2026-11-19', 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades'),
    ('ROCA', 'CAMBIO', 'Estación Hipólito Yrigoyen cerrada',
     'Afecta a los ramales Plaza Constitución – Ezeiza, Alejandro Korn y Bosques vía Temperley.',
     NULL, NULL, DATE '2026-10-23', NULL, 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades'),
    ('ROCA', 'CAMBIO', 'Cañuelas – Lobos interrumpido',
     'Sin servicio entre Empalme Lobos y Lobos por renovación de vías.',
     NULL, NULL, DATE '2026-10-23', NULL, 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades'),
    ('SARMIENTO', 'CAMBIO', 'Andenes centrales en Ramos Mejía y Ciudadela',
     'Los trenes Once – Moreno paran en los andenes centrales. Acceso por el túnel peatonal, Av. de Mayo (Ramos Mejía) y la calle 9 de Julio (Ciudadela).',
     'Desde el 24 de octubre a las 12', NULL, DATE '2026-10-24', DATE '2026-11-30', 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades'),
    ('SARMIENTO', 'CAMBIO', 'Merlo – Lobos limitado a Merlo – Las Heras',
     'Recorrido limitado por renovación de vías, con horario especial.',
     NULL, NULL, DATE '2026-10-23', NULL,
     'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/areametropolitana/lineasarmiento/merlo-lobos'),
    ('BELGRANO_SUR', 'CAMBIO', 'Dr. Sáenz – M.C.G. Belgrano limitado',
     'Por obras, los trenes circulan solo entre Tapiales y Marinos del Crucero Gral. Belgrano.',
     NULL, NULL, DATE '2026-10-23', NULL, 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades'),
    ('BELGRANO_SUR', 'CAMBIO', 'Puente Alsina – Aldo Bonzi interrumpido',
     'Sin servicio hasta nuevo aviso por razones de seguridad operacional.',
     NULL, NULL, DATE '2026-10-23', NULL, 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades')
) AS v (line_code, kind, title, description, days, schedule, valid_from, valid_until, url)
JOIN transport_line tl ON tl.mode = 'TREN' AND tl.code = v.line_code;
