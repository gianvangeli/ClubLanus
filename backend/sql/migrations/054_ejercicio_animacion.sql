-- La Pizarra Táctica pro (con animación por escenas) pasa a usarse también
-- en el ejercicio de "Agenda diaria" (tabla `ejercicios`), no solo en
-- Entrenamientos Desglosados (`ejercicios_tacticos`, que ya tenía esta
-- columna desde la migración 052). Misma columna, mismo criterio: se
-- reemplaza al regenerar en vez de acumular.
ALTER TABLE ejercicios
  ADD COLUMN animacion_video_url VARCHAR(500) DEFAULT NULL AFTER pizarra_archivo_nombre_original;
