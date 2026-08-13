-- Calendario del jugador: para poder colorear cada bloque (rojo=general,
-- azul=preparador físico, verde=cancha, amarillo=viaje) hace falta un tipo
-- más fino que la vieja "categoria" (solo cuerpo_tecnico/preparador_fisico).
ALTER TABLE microciclo_bloques
  ADD COLUMN tipo_actividad ENUM('general','preparador_fisico','cancha','viaje') DEFAULT NULL AFTER categoria;

-- Backfill de los bloques ya cargados: preparador_fisico se mapea directo;
-- cuerpo_tecnico se separa por si ya tenía espacio_trabajo cargado (eso
-- solo se completa para trabajo en cancha) — "viaje" no se puede inferir
-- solo, esos bloques quedan en "general" hasta que el cuerpo técnico los
-- reclasifique manualmente editándolos.
UPDATE microciclo_bloques SET tipo_actividad = 'preparador_fisico' WHERE categoria = 'preparador_fisico';
UPDATE microciclo_bloques SET tipo_actividad = 'cancha' WHERE categoria = 'cuerpo_tecnico' AND espacio_trabajo IS NOT NULL;
UPDATE microciclo_bloques SET tipo_actividad = 'general' WHERE categoria = 'cuerpo_tecnico' AND espacio_trabajo IS NULL;
