-- Estadísticas de partido: informe táctico (formato Wyscout) leído por IA,
-- con revisión previa (ver estadisticasPartidoController). Se guarda el PDF
-- original además de los datos extraídos porque el v1 deja fuera de
-- alcance los datos evento-por-evento (mapa de tiros, mapa de centros): el
-- cuerpo técnico va a querer volver al PDF para eso, y también para
-- auditar lo que extrajo la IA.

-- Cabecera del partido + estadísticas de equipo (comparativa Lanús vs
-- rival). Los indicadores se guardan como JSON (array de {categoria,
-- indicador, valor_lanus, valor_rival}) en vez de una columna por métrica,
-- mismo razonamiento que picos_rendimiento: son ~50 métricas agrupadas en
-- 12 categorías y el modelo puede seguir ajustándose.
CREATE TABLE estadisticas_partido (
  id INT NOT NULL AUTO_INCREMENT,
  fecha DATE NOT NULL,
  rival VARCHAR(200) NOT NULL,
  condicion ENUM('local', 'visitante') NULL,
  resultado VARCHAR(20) NULL,
  competencia VARCHAR(200) NULL,
  equipo_indicadores TEXT NOT NULL,
  archivo VARCHAR(500) NULL,
  nombre_archivo VARCHAR(255) NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY registrado_por (registrado_por),
  CONSTRAINT estadisticas_partido_ibfk_1 FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estadísticas por jugador del plantel propio en ese partido: una fila por
-- jugador, indicadores como JSON (array de {categoria, indicador, valor})
-- con categoria en {Generales, Duelos, Organización (pases), Arquero} —
-- mismo shape que picos_rendimiento, para reusar el mismo estilo de
-- agrupación/UI (agruparPorCategoria). Jugadores del equipo rival quedan
-- fuera: no existen en la tabla jugadores, no hay a quién asignarlos.
CREATE TABLE estadisticas_partido_jugadores (
  id INT NOT NULL AUTO_INCREMENT,
  partido_id INT NOT NULL,
  jugador_id INT NOT NULL,
  indicadores TEXT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY partido_id (partido_id),
  KEY jugador_id (jugador_id),
  CONSTRAINT estadisticas_partido_jugadores_ibfk_1 FOREIGN KEY (partido_id) REFERENCES estadisticas_partido (id) ON DELETE CASCADE,
  CONSTRAINT estadisticas_partido_jugadores_ibfk_2 FOREIGN KEY (jugador_id) REFERENCES jugadores (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
