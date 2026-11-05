-- Las acciones a balón parado (categoría "pelota_parada") se registran "a
-- favor" (la ejecuta el plantel propio) o "en contra" (la defiende) — antes
-- esto estaba mezclado como una opción más de sub-categoría ("ABP en
-- contra"), junto con córner/tiro libre, que es un eje de clasificación
-- distinto. Pasa a ser su propio campo, independiente de la sub-categoría.
ALTER TABLE ejercicios_tacticos
  ADD COLUMN favor_contra ENUM('favor', 'contra') NULL AFTER subcategoria;
