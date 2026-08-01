-- Elimina las áreas "Cargas físicas" y "Videos" de la ficha del jugador
-- (ya cubiertas por Preparación física y por los módulos que ya suben
-- video: Biblioteca, Entrenamientos, Análisis futbolístico, etc.)
DROP TABLE IF EXISTS cargas_fisicas;
DROP TABLE IF EXISTS video_jugadores;

-- Semáforo de Psicología: lo carga exclusivamente el psicólogo asignado
-- (cuenta privada). El cuerpo técnico solo lo ve, nunca lo edita.
ALTER TABLE jugadores
  ADD COLUMN semaforo_psicologico ENUM('verde','amarillo','rojo') DEFAULT NULL AFTER psicologo_id;

-- Semáforo de Análisis futbolístico: lo carga un integrante del cuerpo
-- técnico (chances de jugar en primera).
ALTER TABLE jugadores
  ADD COLUMN semaforo_analisis ENUM('verde','amarillo','rojo') DEFAULT NULL AFTER semaforo_psicologico;
