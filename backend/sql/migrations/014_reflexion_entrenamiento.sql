-- Página de reflexión post-entrenamiento (una por sesión, no una lista como
-- los ejercicios). Material exclusivo del cuerpo técnico.
ALTER TABLE entrenamientos
  ADD COLUMN reflexion_dia DATE NULL,
  ADD COLUMN reflexion_sesion_numero VARCHAR(20) NULL,
  ADD COLUMN reflexion_turno VARCHAR(50) NULL,
  ADD COLUMN reflexion_objetivo TEXT NULL,
  ADD COLUMN reflexion_logro_objetivo TEXT NULL,
  ADD COLUMN reflexion_respuesta_jugadores TEXT NULL,
  ADD COLUMN reflexion_intervencion_ct TEXT NULL,
  ADD COLUMN reflexion_modificaciones TEXT NULL,
  ADD COLUMN reflexion_entrenador_cargo VARCHAR(150) NULL,
  ADD COLUMN reflexion_firma VARCHAR(150) NULL;
