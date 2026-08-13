-- Videos individuales del jugador: segunda vía de "Biblioteca", pensada
-- para video personal y libre. No hay paso de asignación: el video subido
-- acá es, directamente, del jugador de la ficha. Reutiliza la tabla
-- genérica "videos" con categoria_video = 'individual'.
CREATE TABLE jugador_videos (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  video_id INT NOT NULL,
  subido_por INT DEFAULT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY video_id (video_id),
  CONSTRAINT jugador_videos_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT jugador_videos_ibfk_2 FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
