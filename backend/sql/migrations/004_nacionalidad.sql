-- Nacionalidad del jugador. Admite doble nacionalidad (ej: Argentina/Paraguay);
-- la segunda es opcional.
ALTER TABLE jugadores
  ADD COLUMN nacionalidad_1 VARCHAR(60) NULL AFTER altura,
  ADD COLUMN nacionalidad_2 VARCHAR(60) NULL AFTER nacionalidad_1;
