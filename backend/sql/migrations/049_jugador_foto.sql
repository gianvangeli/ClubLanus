-- Foto de perfil del jugador (reemplaza el avatar de iniciales en el
-- listado y la ficha cuando está cargada). Igual que otros archivos del
-- sistema, se guarda la "key" interna (ver config/storage.js), nunca se
-- expone directo: se sirve vía GET /jugadores/:id/foto.
ALTER TABLE jugadores
  ADD COLUMN foto_url VARCHAR(500) DEFAULT NULL AFTER apellido;
