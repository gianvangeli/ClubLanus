-- Los objetivos nutricionales por categoría quedan acotados a lo que
-- realmente se usa: suma de 6 pliegues e índice músculo-óseo. El rango de
-- peso y el IMC de referencia no aplican y se sacan.
ALTER TABLE objetivos_nutricionales
  DROP COLUMN peso_min,
  DROP COLUMN peso_max,
  DROP COLUMN imc_objetivo;
