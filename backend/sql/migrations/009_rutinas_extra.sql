-- Entrenamientos extra ("rutinas") para que el jugador trabaje fuera del
-- club: el CT las carga como generales (todo el plantel) o individuales
-- (jugadores puntuales), y cada jugador marca su propio cumplimiento.

ALTER TABLE videos
  MODIFY COLUMN categoria_video ENUM('partido','entrenamiento','individual','rutina') NOT NULL;

CREATE TABLE rutinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  alcance ENUM('general','individual') NOT NULL DEFAULT 'general',
  creado_por INT DEFAULT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT rutinas_creado_por_fk FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Asignación de una rutina individual a jugadores puntuales (sin uso si alcance='general')
CREATE TABLE rutina_jugadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rutina_id INT NOT NULL,
  jugador_id INT NOT NULL,
  UNIQUE KEY uniq_rutina_jugador (rutina_id, jugador_id),
  CONSTRAINT rutina_jugadores_rutina_fk FOREIGN KEY (rutina_id) REFERENCES rutinas (id) ON DELETE CASCADE,
  CONSTRAINT rutina_jugadores_jugador_fk FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Video(s) demostrativo(s) de la rutina (opcional)
CREATE TABLE rutina_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rutina_id INT NOT NULL,
  video_id INT NOT NULL,
  CONSTRAINT rutina_videos_rutina_fk FOREIGN KEY (rutina_id) REFERENCES rutinas (id) ON DELETE CASCADE,
  CONSTRAINT rutina_videos_video_fk FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estado de cumplimiento de cada jugador para cada rutina que le corresponde
CREATE TABLE rutina_completados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rutina_id INT NOT NULL,
  jugador_id INT NOT NULL,
  completado TINYINT(1) NOT NULL DEFAULT 0,
  completado_en TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uniq_rutina_completado (rutina_id, jugador_id),
  CONSTRAINT rutina_completados_rutina_fk FOREIGN KEY (rutina_id) REFERENCES rutinas (id) ON DELETE CASCADE,
  CONSTRAINT rutina_completados_jugador_fk FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
