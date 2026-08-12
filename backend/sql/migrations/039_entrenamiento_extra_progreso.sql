-- Entrenamientos extra: el jugador ahora tiene acceso a los planes que le
-- asigna el cuerpo técnico y puede registrar su propio seguimiento (peso
-- usado, duración, horario, observaciones) por cada vez que lo realiza.
CREATE TABLE entrenamiento_extra_registros (
  id INT NOT NULL AUTO_INCREMENT,
  plan_id INT NOT NULL,
  fecha DATE NOT NULL,
  peso_kg DECIMAL(5,2) DEFAULT NULL,
  duracion_min INT DEFAULT NULL,
  horario VARCHAR(50) DEFAULT NULL,
  observaciones TEXT,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY plan_id (plan_id),
  CONSTRAINT entrenamiento_extra_registros_ibfk_1 FOREIGN KEY (plan_id) REFERENCES planes_entrenamiento_extra (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
