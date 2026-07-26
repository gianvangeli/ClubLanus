-- Reemplaza la edad cargada a mano por la fecha de nacimiento: la edad se
-- calcula siempre a partir de esta fecha (ver calcularEdad en el backend),
-- nunca se vuelve a cargar manualmente.
ALTER TABLE jugadores
  ADD COLUMN fecha_nacimiento DATE NULL,
  DROP COLUMN edad;
