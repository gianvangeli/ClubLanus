-- Se reutiliza la tabla cargas_fisicas (ya existía, sin uso) para cargar
-- reportes de cargas físicas del jugador en PDF a lo largo del campeonato.
ALTER TABLE cargas_fisicas
  ADD COLUMN titulo VARCHAR(150) NULL AFTER fecha,
  ADD COLUMN archivo_pdf VARCHAR(255) NULL AFTER titulo;
