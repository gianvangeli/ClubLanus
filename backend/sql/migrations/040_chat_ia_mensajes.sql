-- Historial del chat con IA de "Preparación física": conversación por
-- jugador (aunque el contexto que recibe la IA incluya a todo el plantel de
-- su categoría, para poder comparar). Se persiste para que el cuerpo técnico
-- pueda volver a leerla o seguir preguntando más adelante.
CREATE TABLE chat_ia_mensajes (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  rol ENUM('usuario', 'asistente') NOT NULL,
  contenido TEXT NOT NULL,
  archivo_json JSON DEFAULT NULL,
  creado_por INT DEFAULT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY creado_por (creado_por),
  CONSTRAINT chat_ia_mensajes_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT chat_ia_mensajes_ibfk_2 FOREIGN KEY (creado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
