-- Los videos de Biblioteca ya no piden categoría/rival/resultado/duración al
-- cuerpo técnico: se etiquetan internamente como 'biblioteca'.
ALTER TABLE videos
  MODIFY COLUMN categoria_video ENUM('partido','entrenamiento','individual','rutina','biblioteca') NOT NULL;
