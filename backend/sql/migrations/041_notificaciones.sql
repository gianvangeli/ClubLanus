-- Notificaciones de la plataforma: la campanita de arriba a la derecha.
-- Genérica por usuario (no solo jugadores), para poder usarse también con
-- cuerpo técnico/psicólogo más adelante. "ruta" es la URL del frontend a la
-- que navega el usuario al hacer click en la notificación.
CREATE TABLE notificaciones (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  ruta VARCHAR(300) NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY usuario_id (usuario_id),
  CONSTRAINT notificaciones_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
