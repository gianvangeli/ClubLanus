-- Dentro de "Entrenamientos desglosados", además de la lista general, el CT
-- puede subir ejercicios tácticos organizados en categorías fijas (Rondos,
-- Pelota parada) con sus propias sub-categorías (ver ejerciciosTacticosController.js
-- para la lista completa). Cada ejercicio tiene los mismos datos que la
-- lista general (fecha, descripción de la dinámica, cantidad de jugadores,
-- video) más su propia pizarra táctica (igual que en los ejercicios de
-- planificación por sesión). Visible para todo el plantel, como el resto
-- del módulo Entrenamientos.
CREATE TABLE ejercicios_tacticos (
  id INT NOT NULL AUTO_INCREMENT,
  categoria VARCHAR(30) NOT NULL,
  subcategoria VARCHAR(60) NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  fecha DATE NULL,
  descripcion TEXT NULL,
  cantidad_jugadores INT NULL,
  video_tipo ENUM('archivo','link') NULL,
  video_url VARCHAR(500) NULL,
  video_nombre_original VARCHAR(255) NULL,
  dibujo_json LONGTEXT NULL,
  creado_por INT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ejercicios_tacticos_creado_por_fk (creado_por),
  CONSTRAINT ejercicios_tacticos_creado_por_fk FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
