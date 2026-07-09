-- Contrato (Sí/No), datos del agente del jugador y contacto de emergencia.
ALTER TABLE jugadores
  ADD COLUMN contrato ENUM('si','no') NULL AFTER division_nombre,
  ADD COLUMN agente_nombre VARCHAR(100) NULL,
  ADD COLUMN agente_apellido VARCHAR(100) NULL,
  ADD COLUMN agente_mail VARCHAR(150) NULL,
  ADD COLUMN agente_telefono VARCHAR(50) NULL,
  ADD COLUMN contacto_emergencia_nombre VARCHAR(100) NULL,
  ADD COLUMN contacto_emergencia_apellido VARCHAR(100) NULL,
  ADD COLUMN contacto_emergencia_relacion VARCHAR(100) NULL,
  ADD COLUMN contacto_emergencia_telefono VARCHAR(50) NULL;
