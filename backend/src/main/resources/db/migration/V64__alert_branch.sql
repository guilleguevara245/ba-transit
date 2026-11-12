-- El ramal al que se refiere una alerta, si es de uno solo (las de Trenes
-- Argentinos vienen por ramal: "El servicio G. Catán circula con demoras"
-- no afecta al ramal a M.C.G. Belgrano). Sin ramal: toda la linea.
ALTER TABLE alert ADD COLUMN branch_id BIGINT REFERENCES branch (id);
