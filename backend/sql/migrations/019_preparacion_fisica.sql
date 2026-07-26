-- Preparación física: cuatro sub-apartados independientes.

-- a) Picos de máximo rendimiento: cada evaluación es un registro propio
-- (fecha + partido + indicadores físicos), pensado para compararse entre
-- fechas. Los indicadores se guardan como JSON (array de {categoria,
-- indicador, valor}) porque el modelo de indicadores todavía puede
-- cambiar; así no hace falta una migración cada vez que se ajusta.
CREATE TABLE picos_rendimiento (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  partido VARCHAR(200) NOT NULL,
  indicadores TEXT NOT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT picos_rendimiento_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT picos_rendimiento_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- b) Cargas físicas de preparación física: registro simple de
-- entrenamiento/partido + observaciones (distinto del módulo de Cargas
-- Físicas en PDF que ya existía en la ficha del jugador).
CREATE TABLE cargas_preparacion_fisica (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  entrenamiento_partido VARCHAR(200) NOT NULL,
  observaciones TEXT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT cargas_preparacion_fisica_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT cargas_preparacion_fisica_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- c) Informe físico (portada): único y permanente por jugador, se edita in
-- place (UPSERT), nunca genera historial.
CREATE TABLE informes_fisicos (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fortalezas TEXT NULL,
  debilidades TEXT NULL,
  aspectos_mantener TEXT NULL,
  aspectos_mejorar TEXT NULL,
  actualizado_por INT NULL,
  actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY jugador_id (jugador_id),
  KEY actualizado_por (actualizado_por),
  CONSTRAINT informes_fisicos_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT informes_fisicos_ibfk_2 FOREIGN KEY (actualizado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- d) Entrenamientos extra: planes individuales, cada uno con su archivo
-- (opcional) y su informe. Cada plan es un registro propio.
CREATE TABLE planes_entrenamiento_extra (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  archivo VARCHAR(500) NULL,
  nombre_archivo VARCHAR(255) NULL,
  informe TEXT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT planes_entrenamiento_extra_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT planes_entrenamiento_extra_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
