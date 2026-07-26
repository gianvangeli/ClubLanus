-- Datos (Big Data): almacenamiento/importación de datos estadísticos del
-- jugador. Cada registro es un partido/fecha propio, se acumulan
-- cronológicamente.
CREATE TABLE datos_bigdata (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  partido VARCHAR(200) NOT NULL,
  archivo VARCHAR(500) NULL,
  nombre_archivo VARCHAR(255) NULL,
  informe TEXT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT datos_bigdata_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT datos_bigdata_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
