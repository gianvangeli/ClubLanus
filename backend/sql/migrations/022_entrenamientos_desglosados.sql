-- "Entrenamientos extra" (tarea para que el jugador trabaje afuera, con
-- marca de completado) pasa a ser "Entrenamientos desglosados": un archivo
-- de videos cortos de ejercicios ya realizados en la cancha, con su fecha
-- y cantidad de jugadores, para repasar la dinámica. Ya no hay nada que
-- "completar", así que se suma fecha + cantidad_jugadores y se da de baja
-- el seguimiento de cumplimiento.
ALTER TABLE rutinas
  ADD COLUMN fecha DATE NULL AFTER titulo,
  ADD COLUMN cantidad_jugadores INT NULL AFTER descripcion;

DROP TABLE IF EXISTS rutina_completados;
