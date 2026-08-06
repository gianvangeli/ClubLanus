-- Módulo Calendario: microciclos semanales (una fila = una semana elegida
-- por el cuerpo técnico, no necesariamente lunes a domingo) con bloques de
-- trabajo cargados día por día. Cada bloque tiene horario libre (no franjas
-- horarias fijas), para poder representar días con uno o varios bloques.
CREATE TABLE microciclos (
  id INT NOT NULL AUTO_INCREMENT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  nombre VARCHAR(150) NULL,
  creado_por INT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fecha_inicio (fecha_inicio),
  KEY microciclos_creado_por_fk (creado_por),
  CONSTRAINT microciclos_creado_por_fk FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Categoría fija (preparador físico / cuerpo técnico) para el color del
-- bloque. "espacio_trabajo" es el tipo de cancha para la miniatura (ver
-- CanchaMiniatura en el frontend); el resto son los campos pedidos:
-- espacio, orientación, PSE, objetivo, jugadores por tarea.
CREATE TABLE microciclo_bloques (
  id INT NOT NULL AUTO_INCREMENT,
  microciclo_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NULL,
  categoria ENUM('preparador_fisico','cuerpo_tecnico') NOT NULL,
  titulo VARCHAR(200) NULL,
  descripcion TEXT NULL,
  espacio VARCHAR(150) NULL,
  orientacion VARCHAR(100) NULL,
  pse VARCHAR(50) NULL,
  objetivo VARCHAR(200) NULL,
  espacio_trabajo ENUM('completa','media','reducido') NULL,
  jugadores_por_tarea VARCHAR(100) NULL,
  creado_por INT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY microciclo_bloques_microciclo_fk (microciclo_id),
  KEY microciclo_bloques_creado_por_fk (creado_por),
  CONSTRAINT microciclo_bloques_microciclo_fk FOREIGN KEY (microciclo_id) REFERENCES microciclos (id) ON DELETE CASCADE,
  CONSTRAINT microciclo_bloques_creado_por_fk FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
