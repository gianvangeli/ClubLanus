-- Cada entrenamiento se puede dividir en "ejercicios": una planilla por
-- ejercicio (tipo de trabajo, espacio, materiales, objetivo, descripción,
-- puntuación, cancha editable) al estilo de la planificación táctica en
-- papel del club. Es material exclusivo del cuerpo técnico.
CREATE TABLE ejercicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entrenamiento_id INT NOT NULL,
  numero INT NOT NULL,
  dia DATE NULL,
  sesion_numero VARCHAR(20) NULL,
  turno VARCHAR(50) NULL,
  tipo_trabajo VARCHAR(150) NULL,
  espacio VARCHAR(150) NULL,
  materiales TEXT NULL,
  objetivo TEXT NULL,
  n_jugadores VARCHAR(50) NULL,
  duracion VARCHAR(50) NULL,
  descripcion TEXT NULL,
  puntuacion TEXT NULL,
  entrenador_a_cargo VARCHAR(150) NULL,
  jugadores TEXT NULL,
  pechera VARCHAR(150) NULL,
  dibujo_json LONGTEXT NULL,
  creado_por INT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ejercicios_entrenamiento_fk FOREIGN KEY (entrenamiento_id) REFERENCES entrenamientos (id) ON DELETE CASCADE,
  CONSTRAINT ejercicios_creado_por_fk FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
