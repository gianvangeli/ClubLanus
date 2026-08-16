-- La agenda diaria de entrenamientos pasa de "visible sin restricción" a un
-- modelo de solicitud/aprobación: el jugador pide acceso a una sesión
-- puntual y el cuerpo técnico lo aprueba o rechaza (igual de exigente que
-- Biblioteca, pero acá el pedido lo inicia el jugador).
CREATE TABLE entrenamiento_accesos (
  id INT NOT NULL AUTO_INCREMENT,
  entrenamiento_id INT NOT NULL,
  jugador_id INT NOT NULL,
  estado ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  solicitado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  resuelto_en TIMESTAMP NULL DEFAULT NULL,
  resuelto_por INT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_entrenamiento_jugador (entrenamiento_id, jugador_id),
  KEY entrenamiento_accesos_jugador_fk (jugador_id),
  KEY entrenamiento_accesos_resuelto_por_fk (resuelto_por),
  CONSTRAINT entrenamiento_accesos_entrenamiento_fk FOREIGN KEY (entrenamiento_id) REFERENCES entrenamientos (id) ON DELETE CASCADE,
  CONSTRAINT entrenamiento_accesos_jugador_fk FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT entrenamiento_accesos_resuelto_por_fk FOREIGN KEY (resuelto_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- El título del entrenamiento deja de ser un campo libre: siempre se
-- muestra como "Entrenamiento del [fecha]" calculado en el frontend.
ALTER TABLE entrenamientos DROP COLUMN titulo;
