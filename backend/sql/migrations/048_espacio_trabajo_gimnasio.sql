-- Suma "gimnasio" como opción de espacio de trabajo de un bloque del
-- microciclo (ver 033_calendario_microciclos.sql), para actividades de
-- preparación física que no usan la cancha.
ALTER TABLE microciclo_bloques
  MODIFY espacio_trabajo ENUM('completa', 'media', 'reducido', 'gimnasio') NULL;
