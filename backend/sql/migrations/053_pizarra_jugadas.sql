-- Biblioteca de "jugadas" guardadas desde la Pizarra Táctica: un tablero
-- (dibujo_json, mismo formato v2 de escenas que ejercicios/ejercicios_tacticos)
-- guardado con nombre propio, independiente de cualquier ejercicio puntual,
-- para poder volver a cargarlo en cualquier pizarra más adelante en vez de
-- redibujarlo desde cero.
CREATE TABLE `pizarra_jugadas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `dibujo_json` longtext NOT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pizarra_jugadas_creado_por_fk` (`creado_por`),
  CONSTRAINT `pizarra_jugadas_creado_por_fk` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
