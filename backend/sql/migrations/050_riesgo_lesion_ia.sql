-- Semáforo de riesgo de lesión calculado por el Asistente IA (a diferencia
-- de semaforo_psicologico/semaforo_analisis, que el cuerpo técnico carga a
-- mano). Se recalcula solo cada vez que se agrega un dato relevante del
-- jugador (ver backend/src/config/riesgoIa.js).
ALTER TABLE jugadores
  ADD COLUMN semaforo_riesgo_ia ENUM('verde', 'amarillo', 'rojo') DEFAULT NULL AFTER semaforo_analisis,
  ADD COLUMN motivo_riesgo_ia VARCHAR(300) DEFAULT NULL AFTER semaforo_riesgo_ia,
  ADD COLUMN riesgo_ia_actualizado_en TIMESTAMP NULL DEFAULT NULL AFTER motivo_riesgo_ia;
