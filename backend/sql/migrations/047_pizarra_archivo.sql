-- Cada ejercicio (agenda diaria y entrenamientos desglosados) puede tener
-- la pizarra táctica dibujada (CanchaEditor, dibujo_json) o, como
-- alternativa mutuamente excluyente, una imagen o video ya armado. Mismo
-- patrón que "análisis armado vs. PDF" de Biblioteca (analisis_modo).
ALTER TABLE ejercicios_tacticos
  ADD COLUMN pizarra_modo ENUM('dibujo','archivo') DEFAULT NULL AFTER dibujo_json,
  ADD COLUMN pizarra_archivo_url VARCHAR(500) DEFAULT NULL AFTER pizarra_modo,
  ADD COLUMN pizarra_archivo_tipo ENUM('imagen','video') DEFAULT NULL AFTER pizarra_archivo_url,
  ADD COLUMN pizarra_archivo_nombre_original VARCHAR(255) DEFAULT NULL AFTER pizarra_archivo_tipo;

ALTER TABLE ejercicios
  ADD COLUMN pizarra_modo ENUM('dibujo','archivo') DEFAULT NULL AFTER dibujo_json,
  ADD COLUMN pizarra_archivo_url VARCHAR(500) DEFAULT NULL AFTER pizarra_modo,
  ADD COLUMN pizarra_archivo_tipo ENUM('imagen','video') DEFAULT NULL AFTER pizarra_archivo_url,
  ADD COLUMN pizarra_archivo_nombre_original VARCHAR(255) DEFAULT NULL AFTER pizarra_archivo_tipo;

-- Los "Rondos" quedan reducidos a +5/+10/+15/+20; el resto de sus antiguas
-- subcategorías se separan en categorías propias de primer nivel (sin
-- subdivisión), igual que "Ejercicios individuales" (nueva). Esas
-- categorías nuevas no tienen subcategoría, así que la columna deja de ser
-- obligatoria.
ALTER TABLE ejercicios_tacticos MODIFY subcategoria VARCHAR(60) NULL;
