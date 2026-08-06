-- Trámite de la segunda nacionalidad (jugadores con doble nacionalidad en
-- curso de obtenerla, o ya obtenida): estado del trámite para el país
-- cargado en nacionalidad_2. NULL cuando no aplica/no se informó.
ALTER TABLE jugadores
  ADD COLUMN nacionalidad_2_tramite ENUM('en_curso', 'finalizado') NULL AFTER nacionalidad_2;
