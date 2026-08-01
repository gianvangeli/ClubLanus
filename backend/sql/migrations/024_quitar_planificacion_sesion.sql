-- La planificación a nivel sesión (tipo, duración, objetivo, materiales,
-- espacios, observaciones, cantidad de jugadores, dibujo táctico) queda
-- reemplazada por el detalle ejercicio por ejercicio: la tabla `ejercicios`
-- ya tiene sus propios campos equivalentes (tipo_trabajo, espacio,
-- materiales, objetivo, n_jugadores, duracion, dibujo_json). Se eliminan
-- las columnas redundantes de `entrenamientos`.
ALTER TABLE entrenamientos
  DROP COLUMN tipo_entrenamiento,
  DROP COLUMN duracion_minutos,
  DROP COLUMN objetivo,
  DROP COLUMN observaciones,
  DROP COLUMN cantidad_jugadores,
  DROP COLUMN materiales,
  DROP COLUMN espacios,
  DROP COLUMN dibujo_url;
