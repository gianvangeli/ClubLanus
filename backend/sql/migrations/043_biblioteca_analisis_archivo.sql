-- Análisis rival: alternativa al plan armado cuadro por cuadro en la app,
-- para subir directamente el PDF que arma el analista de video. Mismo
-- patrón mutuamente-excluyente que dietas_jugador (modo armado/archivo).
ALTER TABLE biblioteca
  ADD COLUMN analisis_modo ENUM('armado','archivo') DEFAULT NULL AFTER plan_partido_json,
  ADD COLUMN analisis_pdf_url VARCHAR(500) DEFAULT NULL AFTER analisis_modo,
  ADD COLUMN analisis_pdf_nombre_original VARCHAR(255) DEFAULT NULL AFTER analisis_pdf_url;
