-- Agrega la fecha de alta médica a las lesiones. Mientras no tenga fecha
-- de alta cargada, la lesión se considera activa (usado por el módulo
-- General para el semáforo de estado por jugador).

ALTER TABLE lesiones
  ADD COLUMN fecha_alta DATE DEFAULT NULL AFTER proceso_recuperacion;
