-- El módulo de nutrición se divide en 3 páginas: Informe (resumen con
-- gráficos), Evaluaciones (carga semanal) y Dieta personalizada.

-- Fraccionamiento de 5 masas: se agregan masa residual y masa de la piel,
-- y se renombra masa_osea a masa_osea_kg para que quede claro que es kg
-- (igual que muscular/adiposa). Los 5 porcentajes se calculan siempre
-- kg/peso*100, nunca se cargan a mano.
ALTER TABLE nutricion_evaluaciones
  CHANGE COLUMN masa_osea masa_osea_kg DECIMAL(5,2) NOT NULL,
  ADD COLUMN masa_residual_kg DECIMAL(5,2) NULL AFTER masa_osea_kg,
  ADD COLUMN masa_piel_kg DECIMAL(5,2) NULL AFTER masa_residual_kg;

-- Objetivos nutricionales por categoría: configuración aparte, solo
-- editable por CT/admin, no se toca desde la ficha del jugador.
CREATE TABLE objetivos_nutricionales (
  id INT NOT NULL AUTO_INCREMENT,
  categoria VARCHAR(100) NOT NULL,
  peso_min DECIMAL(5,2) NULL,
  peso_max DECIMAL(5,2) NULL,
  suma_6_pliegues_objetivo DECIMAL(6,2) NULL,
  indice_musculo_oseo_objetivo DECIMAL(5,2) NULL,
  imc_objetivo DECIMAL(5,2) NULL,
  actualizado_por INT NULL,
  actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY categoria (categoria),
  CONSTRAINT objetivos_nutricionales_actualizado_por_fk FOREIGN KEY (actualizado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dieta personalizada: informe único y permanente por jugador (no
-- histórico), igual que informes_fisicos/perfiles_psicosociales.
CREATE TABLE dietas_jugador (
  id INT NOT NULL AUTO_INCREMENT,
  jugador_id INT NOT NULL,
  plan TEXT NULL,
  actualizado_por INT NULL,
  actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY jugador_id (jugador_id),
  CONSTRAINT dietas_jugador_jugador_fk FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE,
  CONSTRAINT dietas_jugador_actualizado_por_fk FOREIGN KEY (actualizado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
