-- Trámite de segunda nacionalidad: agrega "sin_iniciar" como estado
-- intermedio entre "sin especificar" (NULL) y "en curso".
ALTER TABLE jugadores
  MODIFY COLUMN nacionalidad_2_tramite ENUM('sin_iniciar','en_curso','finalizado') NULL;

-- Contrato: vencimiento acotado a julio o diciembre (convención habitual
-- del mercado de pases), de cualquier año.
ALTER TABLE jugadores
  ADD COLUMN contrato_hasta_mes ENUM('julio','diciembre') DEFAULT NULL AFTER contrato,
  ADD COLUMN contrato_hasta_anio SMALLINT DEFAULT NULL AFTER contrato_hasta_mes;

-- Agente: se descarta el "tipo" persona/empresa excluyente (migración 035)
-- a favor de un modelo más real: el agente es una persona (nombre y
-- apellido) que además puede pertenecer a una empresa/agencia — dato
-- aparte, no una alternativa.
ALTER TABLE jugadores
  DROP COLUMN agente_tipo;
