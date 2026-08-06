-- Biblioteca distingue publicaciones de tipo "análisis" (propio o rival) de
-- las de tipo "partido" (el partido en sí). El análisis de rival además
-- puede traer un plan de partido: una secuencia de cuadros de pizarra
-- táctica con su leyenda, guardado como JSON en texto (mismo patrón que
-- ejercicios.dibujo_json / ejercicios_tacticos.dibujo_json).
ALTER TABLE biblioteca
  ADD COLUMN tipo ENUM('analisis','partido') NOT NULL DEFAULT 'partido' AFTER descripcion,
  ADD COLUMN analisis_tipo ENUM('propio','rival') DEFAULT NULL AFTER tipo,
  ADD COLUMN plan_partido_json LONGTEXT DEFAULT NULL AFTER analisis_tipo;
