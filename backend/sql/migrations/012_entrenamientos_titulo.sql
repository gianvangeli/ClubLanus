-- Cada sesión de entrenamiento pasa a tener su propia "página": necesita un
-- título propio (visible también para el jugador, junto con los videos).
ALTER TABLE entrenamientos
  ADD COLUMN titulo VARCHAR(150) NULL AFTER fecha;
