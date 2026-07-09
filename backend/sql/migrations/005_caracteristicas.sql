-- Características del jugador: pie hábil, posición en la cancha (para el
-- gráfico de cancha) y minutos jugados. Reemplaza a la sección de
-- "Estadísticas" (tarjetas, goles) que no se usa.
ALTER TABLE jugadores
  ADD COLUMN pie ENUM('derecho','izquierdo') NULL,
  ADD COLUMN posicion_cancha VARCHAR(30) NULL,
  ADD COLUMN minutos_jugados INT NULL;
