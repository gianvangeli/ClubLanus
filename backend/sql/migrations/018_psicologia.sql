-- Nuevo rol: psicólogo del jugador. Tiene acceso exclusivo a los informes
-- psicológicos de los jugadores que tiene asignados; nadie más (cuerpo
-- técnico, dirigencia, el propio jugador) puede verlos.
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin','entrenador','preparador_fisico','jugador','psicologo') NOT NULL;

-- Psicólogo asignado a cada jugador (uno por jugador; el mismo psicólogo
-- puede estar asignado a varios jugadores).
ALTER TABLE jugadores
  ADD COLUMN psicologo_id INT NULL,
  ADD CONSTRAINT jugadores_ibfk_2 FOREIGN KEY (psicologo_id) REFERENCES usuarios (id);

-- Perfil psicosocial: informe único y permanente por jugador. Se edita in
-- place (UPSERT), nunca genera historial. Es trabajo del cuerpo
-- técnico/dirigencia, no del psicólogo.
CREATE TABLE perfiles_psicosociales (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  contenido TEXT NULL,
  actualizado_por INT NULL,
  actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY jugador_id (jugador_id),
  KEY actualizado_por (actualizado_por),
  CONSTRAINT perfiles_psicosociales_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT perfiles_psicosociales_ibfk_2 FOREIGN KEY (actualizado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Informes psicológicos: historial, cada nuevo informe es un registro
-- propio (nunca se sobrescribe uno anterior). Acceso exclusivo del
-- psicólogo asignado al jugador.
CREATE TABLE informes_psicologicos (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  fecha DATE NOT NULL,
  informe TEXT NOT NULL,
  plan_mejora TEXT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jugador_id (jugador_id),
  KEY registrado_por (registrado_por),
  CONSTRAINT informes_psicologicos_ibfk_1 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT informes_psicologicos_ibfk_2 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
