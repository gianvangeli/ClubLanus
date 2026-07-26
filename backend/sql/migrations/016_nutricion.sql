-- Historial de evaluaciones nutricionales del jugador: cada carga genera un
-- registro nuevo, nunca se sobrescribe una evaluación anterior (para poder
-- consultar la evolución completa en el tiempo).
CREATE TABLE nutricion_evaluaciones (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  peso DECIMAL(5,2) NOT NULL,
  talla DECIMAL(5,2) NOT NULL,
  masa_muscular_kg DECIMAL(5,2) NOT NULL,
  masa_adiposa_kg DECIMAL(5,2) NOT NULL,
  sumatoria_pliegues DECIMAL(6,2) NOT NULL,
  masa_osea DECIMAL(5,2) NOT NULL,
  indice_musculo_oseo DECIMAL(5,2) NOT NULL,
  observaciones TEXT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT nutricion_evaluaciones_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT nutricion_evaluaciones_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
