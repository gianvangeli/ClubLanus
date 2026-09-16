-- Miniatura (PNG en base64) de la pizarra dibujada, para poder mostrar el
-- tablero guardado como una imagen chica en la ficha del ejercicio en vez
-- de la cancha editable completa, y recién montar la pizarra de verdad
-- (Konva) cuando se abre a pantalla completa para editar.
ALTER TABLE ejercicios_tacticos
  ADD COLUMN dibujo_thumbnail LONGTEXT DEFAULT NULL AFTER dibujo_json;

ALTER TABLE ejercicios
  ADD COLUMN dibujo_thumbnail LONGTEXT DEFAULT NULL AFTER dibujo_json;
