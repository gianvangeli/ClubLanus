-- Video real de un ejercicio: para poder comparar la animación de la
-- pizarra con cómo se ejecutó en la cancha. Mismo patrón que
-- entrenamiento_videos (tabla puente a la tabla `videos` ya existente).
ALTER TABLE videos
  MODIFY COLUMN categoria_video ENUM('partido','entrenamiento','individual','rutina','biblioteca','ejercicio') NOT NULL;

CREATE TABLE ejercicio_videos (
  id INT NOT NULL AUTO_INCREMENT,
  ejercicio_id INT NOT NULL,
  video_id INT NOT NULL,
  PRIMARY KEY (id),
  KEY ejercicio_id (ejercicio_id),
  KEY video_id (video_id),
  CONSTRAINT ejercicio_videos_ibfk_1 FOREIGN KEY (ejercicio_id) REFERENCES ejercicios (id) ON DELETE CASCADE,
  CONSTRAINT ejercicio_videos_ibfk_2 FOREIGN KEY (video_id) REFERENCES videos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
