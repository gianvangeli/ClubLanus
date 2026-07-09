-- Agrega apellido a jugadores (registro por cuerpo técnico: nombre + apellido + edad + peso + altura)
ALTER TABLE jugadores
  ADD COLUMN apellido VARCHAR(100) NULL AFTER nombre;

-- Corrige el typo del enum de roles (prerador_fisico -> preparador_fisico)
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin','entrenador','preparador_fisico','jugador') NOT NULL;
