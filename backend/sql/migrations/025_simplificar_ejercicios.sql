-- En la planilla de cada ejercicio se descartan los campos secundarios,
-- para priorizar la carga rápida y la pizarra táctica.
ALTER TABLE ejercicios
  DROP COLUMN sesion_numero,
  DROP COLUMN turno,
  DROP COLUMN materiales,
  DROP COLUMN puntuacion,
  DROP COLUMN entrenador_a_cargo,
  DROP COLUMN jugadores,
  DROP COLUMN pechera;
