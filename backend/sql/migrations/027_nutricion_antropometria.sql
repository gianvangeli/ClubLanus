-- Agrega el protocolo antropométrico completo (básicos, diámetros,
-- perímetros y los 6 pliegues individuales) a las evaluaciones nutricionales.
-- La suma de 6 pliegues deja de cargarse a mano: se calcula sumando los
-- 6 pliegues individuales. Las 5 masas en kg se siguen cargando a mano.

ALTER TABLE nutricion_evaluaciones
  ADD COLUMN talla_sentado_cm DECIMAL(5,2) DEFAULT NULL AFTER talla,
  ADD COLUMN envergadura_cm DECIMAL(5,2) DEFAULT NULL AFTER talla_sentado_cm,
  ADD COLUMN altura_pie_cm DECIMAL(5,2) DEFAULT NULL AFTER envergadura_cm,

  ADD COLUMN diametro_biacromial DECIMAL(5,2) DEFAULT NULL AFTER altura_pie_cm,
  ADD COLUMN diametro_torax_transverso DECIMAL(5,2) DEFAULT NULL AFTER diametro_biacromial,
  ADD COLUMN diametro_torax_anteroposterior DECIMAL(5,2) DEFAULT NULL AFTER diametro_torax_transverso,
  ADD COLUMN diametro_biiliocrestideo DECIMAL(5,2) DEFAULT NULL AFTER diametro_torax_anteroposterior,
  ADD COLUMN diametro_humeral DECIMAL(5,2) DEFAULT NULL AFTER diametro_biiliocrestideo,
  ADD COLUMN diametro_femoral DECIMAL(5,2) DEFAULT NULL AFTER diametro_humeral,

  ADD COLUMN perimetro_cabeza DECIMAL(5,2) DEFAULT NULL AFTER diametro_femoral,
  ADD COLUMN perimetro_brazo_relajado DECIMAL(5,2) DEFAULT NULL AFTER perimetro_cabeza,
  ADD COLUMN perimetro_brazo_flexionado DECIMAL(5,2) DEFAULT NULL AFTER perimetro_brazo_relajado,
  ADD COLUMN perimetro_antebrazo DECIMAL(5,2) DEFAULT NULL AFTER perimetro_brazo_flexionado,
  ADD COLUMN perimetro_torax_mesoesternal DECIMAL(5,2) DEFAULT NULL AFTER perimetro_antebrazo,
  ADD COLUMN perimetro_cintura DECIMAL(5,2) DEFAULT NULL AFTER perimetro_torax_mesoesternal,
  ADD COLUMN perimetro_caderas DECIMAL(5,2) DEFAULT NULL AFTER perimetro_cintura,
  ADD COLUMN perimetro_muslo_superior DECIMAL(5,2) DEFAULT NULL AFTER perimetro_caderas,
  ADD COLUMN perimetro_muslo_medial DECIMAL(5,2) DEFAULT NULL AFTER perimetro_muslo_superior,
  ADD COLUMN perimetro_pantorrilla DECIMAL(5,2) DEFAULT NULL AFTER perimetro_muslo_medial,

  ADD COLUMN pliegue_triceps DECIMAL(5,2) NOT NULL AFTER perimetro_pantorrilla,
  ADD COLUMN pliegue_subescapular DECIMAL(5,2) NOT NULL AFTER pliegue_triceps,
  ADD COLUMN pliegue_supraespinal DECIMAL(5,2) NOT NULL AFTER pliegue_subescapular,
  ADD COLUMN pliegue_abdominal DECIMAL(5,2) NOT NULL AFTER pliegue_supraespinal,
  ADD COLUMN pliegue_muslo DECIMAL(5,2) NOT NULL AFTER pliegue_abdominal,
  ADD COLUMN pliegue_pantorrilla DECIMAL(5,2) NOT NULL AFTER pliegue_muslo;
