-- Distingue si un partido se cargó desde el PDF de Wyscout (preciso, datos
-- de tracking real) o se generó estimando desde un video con IA (mucho
-- menos preciso). La UI usa esto para avisar cuando los datos son una
-- estimación en vez de tratarlos como equivalentes.
ALTER TABLE estadisticas_partido
  ADD COLUMN origen ENUM('pdf', 'video') NOT NULL DEFAULT 'pdf' AFTER competencia;
