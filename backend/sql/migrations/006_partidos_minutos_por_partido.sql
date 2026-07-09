-- Partidos jugados y minutos por partido, como complemento a minutos_jugados.
ALTER TABLE jugadores
  ADD COLUMN partidos_jugados INT NULL,
  ADD COLUMN minutos_por_partido INT NULL;
