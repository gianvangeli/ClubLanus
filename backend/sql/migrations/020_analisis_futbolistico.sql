-- Análisis futbolístico: informes técnicos/tácticos (mensuales,
-- trimestrales o anuales). Cada informe es un registro propio, se
-- almacenan cronológicamente.
CREATE TABLE analisis_futbolistico (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  tipo ENUM('mensual','trimestral','anual') NOT NULL,
  informe TEXT NOT NULL,
  video VARCHAR(500) NULL,
  nombre_video VARCHAR(255) NULL,
  entrenamientos_recomendados TEXT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT analisis_futbolistico_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT analisis_futbolistico_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
