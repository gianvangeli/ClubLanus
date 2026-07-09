-- Historial de composición corporal por jugador (peso + % grasa corporal por fecha).
-- Reemplaza el campo "peso" como valor único: ahora se carga como mediciones en el tiempo.
CREATE TABLE composicion_corporal (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  peso DECIMAL(5,2) NOT NULL,
  grasa_corporal_pct DECIMAL(4,1) NULL,
  observaciones TEXT NULL,
  registrado_por INT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT composicion_corporal_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id),
  CONSTRAINT composicion_corporal_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
