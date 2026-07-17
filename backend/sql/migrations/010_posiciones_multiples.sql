-- Permite marcar varios sectores de la cancha por jugador (antes solo uno).
-- Se guarda como JSON (array de valores de POSICIONES_CANCHA). Se migran los
-- datos existentes de la columna anterior para no perder lo ya cargado.
ALTER TABLE jugadores
  ADD COLUMN posiciones_cancha TEXT NULL AFTER posicion_cancha;

UPDATE jugadores
SET posiciones_cancha = JSON_ARRAY(posicion_cancha)
WHERE posicion_cancha IS NOT NULL;
