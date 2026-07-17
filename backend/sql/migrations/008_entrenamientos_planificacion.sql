ALTER TABLE entrenamientos
  ADD COLUMN cantidad_jugadores INT NULL AFTER duracion_minutos,
  ADD COLUMN materiales TEXT NULL AFTER observaciones,
  ADD COLUMN espacios VARCHAR(255) NULL AFTER materiales,
  ADD COLUMN dibujo_url VARCHAR(255) NULL AFTER espacios;
