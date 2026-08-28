-- Rediseño "Entrenamientos Desglosados" (la biblioteca por categorías de
-- ejercicios_tacticos, no la ficha de ejercicio de una sesión puntual): la
-- descripción libre pasa a ser un editor de texto enriquecido estructurado
-- en tres bloques (Objetivo / Reglas / Puntos de coaching), se suma una
-- duración numérica en minutos (antes solo existía "cantidad_jugadores"),
-- y una columna propia para la animación generada por la pizarra táctica
-- por escenas — coexiste con el video real (video_url/video_tipo), que
-- sigue igual.
-- Columnas nuevas en vez de reemplazar "descripcion": si contenido_json es
-- NULL, el frontend vuelca "descripcion" en el bloque Objetivo la primera
-- vez que se abre la ficha, para no perder lo ya cargado.
ALTER TABLE ejercicios_tacticos
  ADD COLUMN contenido_json JSON DEFAULT NULL AFTER descripcion,
  ADD COLUMN duracion_minutos INT DEFAULT NULL AFTER cantidad_jugadores,
  ADD COLUMN animacion_video_url VARCHAR(500) DEFAULT NULL AFTER video_nombre_original;
