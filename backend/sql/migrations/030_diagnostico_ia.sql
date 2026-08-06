-- Diagnóstico con IA: dentro de cada área (nutrición, lesiones, y las que
-- se sumen más adelante), un modelo de lenguaje (Google Gemini) genera un
-- diagnóstico del jugador con pasos recomendados para evolucionar, usando
-- solo los datos de esa área puntual. Cada generación es un registro
-- propio, se acumulan cronológicamente por área (permite ver la evolución
-- de los diagnósticos de cada área en el tiempo), igual que análisis
-- futbolístico. "area" es VARCHAR (no ENUM) para poder sumar áreas nuevas
-- sin una migración de esquema.
CREATE TABLE diagnosticos_ia (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  area VARCHAR(30) NOT NULL,
  contenido TEXT NOT NULL,
  generado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id_area (jugador_id, area),
  KEY generado_por (generado_por),
  CONSTRAINT diagnosticos_ia_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT diagnosticos_ia_ibfk_2 FOREIGN KEY (generado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
