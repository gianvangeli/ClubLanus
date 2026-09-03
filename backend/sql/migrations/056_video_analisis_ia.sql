-- Diagnóstico táctico automático por IA a partir de un video de Biblioteca
-- (ver bibliotecaController: generarDiagnosticoVideoIA). Mismo patrón que
-- diagnosticos_ia: histórico, un registro nuevo por cada generación, nunca
-- se sobrescribe uno anterior.
CREATE TABLE video_analisis_ia (
  id INT NOT NULL AUTO_INCREMENT,
  video_id INT NOT NULL,
  contenido TEXT NOT NULL,
  generado_por INT NOT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY video_id (video_id),
  KEY generado_por (generado_por),
  CONSTRAINT video_analisis_ia_ibfk_1 FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
  CONSTRAINT video_analisis_ia_ibfk_2 FOREIGN KEY (generado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
