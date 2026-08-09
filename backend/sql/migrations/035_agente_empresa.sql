-- El agente/representante de un jugador puede ser una persona (nombre y
-- apellido, como ya existía) o una empresa/agencia (razón social).
ALTER TABLE jugadores
  ADD COLUMN agente_tipo ENUM('persona','empresa') NOT NULL DEFAULT 'persona' AFTER agente_apellido,
  ADD COLUMN agente_empresa VARCHAR(150) DEFAULT NULL AFTER agente_tipo;
