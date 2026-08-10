-- "Dieta personalizada" pasa a ser "Plan de alimentación individual": el
-- nutricionista puede armarlo en la app (secciones con título + texto +
-- imagen, como las páginas de un plan tipo PDF) o subir directamente un
-- archivo ya armado (PDF/Word/imagen). El jugador lo puede ver (de solo
-- lectura) desde su propia cuenta.
ALTER TABLE dietas_jugador
  ADD COLUMN modo ENUM('armado','archivo') DEFAULT NULL AFTER plan,
  ADD COLUMN secciones_json LONGTEXT DEFAULT NULL AFTER modo,
  ADD COLUMN archivo_url VARCHAR(500) DEFAULT NULL AFTER secciones_json,
  ADD COLUMN archivo_nombre_original VARCHAR(255) DEFAULT NULL AFTER archivo_url;
