-- Las masas corporales y el índice músculo-óseo salieron del alta manual de
-- evaluaciones nutricionales (se van a calcular en la app más adelante), así
-- que ya no siempre vienen cargados. Se sacan las restricciones NOT NULL que
-- quedaban para no romper el guardado de evaluaciones nuevas.
ALTER TABLE nutricion_evaluaciones
  MODIFY masa_muscular_kg DECIMAL(5, 2) DEFAULT NULL,
  MODIFY masa_adiposa_kg DECIMAL(5, 2) DEFAULT NULL,
  MODIFY masa_osea_kg DECIMAL(5, 2) DEFAULT NULL,
  MODIFY indice_musculo_oseo DECIMAL(5, 2) DEFAULT NULL;
