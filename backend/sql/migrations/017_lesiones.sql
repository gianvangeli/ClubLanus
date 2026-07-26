-- Historial médico de lesiones del jugador: cada lesión es un registro
-- propio, nunca se sobrescribe una lesión anterior. Los archivos (estudios,
-- resonancias, informes, etc.) se suben aparte y quedan asociados a la
-- lesión, pudiendo sumarse más a medida que avanza la recuperación.
CREATE TABLE lesiones (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  lesion VARCHAR(200) NOT NULL,
  diagnostico TEXT NULL,
  proceso_recuperacion TEXT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT lesiones_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT lesiones_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Documentos de una lesión: diagnóstico, resonancia, estudio, informe u
-- otro. Se pueden ir agregando de a poco durante toda la recuperación.
CREATE TABLE lesiones_archivos (
  id INT NOT NULL AUTO_INCREMENT,
  lesion_id INT NOT NULL,
  tipo_documento ENUM('diagnostico','resonancia','estudio','informe','otro') NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  archivo VARCHAR(500) NOT NULL,
  subido_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY lesion_id (lesion_id),
  KEY subido_por (subido_por),
  CONSTRAINT lesiones_archivos_ibfk_1 FOREIGN KEY (lesion_id) REFERENCES lesiones (id) ON DELETE CASCADE,
  CONSTRAINT lesiones_archivos_ibfk_2 FOREIGN KEY (subido_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
