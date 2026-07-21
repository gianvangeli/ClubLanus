/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `biblioteca`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biblioteca` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `fecha_publicacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `visible_desde` datetime DEFAULT NULL,
  `creado_por` int NOT NULL,
  `estado` enum('borrador','publicado') DEFAULT 'publicado',
  PRIMARY KEY (`id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `biblioteca_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `biblioteca_informes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biblioteca_informes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `biblioteca_id` int NOT NULL,
  `informe_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `biblioteca_id` (`biblioteca_id`),
  KEY `informe_id` (`informe_id`),
  CONSTRAINT `biblioteca_informes_ibfk_1` FOREIGN KEY (`biblioteca_id`) REFERENCES `biblioteca` (`id`),
  CONSTRAINT `biblioteca_informes_ibfk_2` FOREIGN KEY (`informe_id`) REFERENCES `informes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `biblioteca_pizarras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biblioteca_pizarras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `biblioteca_id` int NOT NULL,
  `pizarra_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `biblioteca_id` (`biblioteca_id`),
  KEY `pizarra_id` (`pizarra_id`),
  CONSTRAINT `biblioteca_pizarras_ibfk_1` FOREIGN KEY (`biblioteca_id`) REFERENCES `biblioteca` (`id`),
  CONSTRAINT `biblioteca_pizarras_ibfk_2` FOREIGN KEY (`pizarra_id`) REFERENCES `pizarras_tacticas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `biblioteca_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biblioteca_usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `biblioteca_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `asignado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `biblioteca_id` (`biblioteca_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `biblioteca_usuarios_ibfk_1` FOREIGN KEY (`biblioteca_id`) REFERENCES `biblioteca` (`id`),
  CONSTRAINT `biblioteca_usuarios_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `biblioteca_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biblioteca_videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `biblioteca_id` int NOT NULL,
  `video_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `biblioteca_id` (`biblioteca_id`),
  KEY `video_id` (`video_id`),
  CONSTRAINT `biblioteca_videos_ibfk_1` FOREIGN KEY (`biblioteca_id`) REFERENCES `biblioteca` (`id`),
  CONSTRAINT `biblioteca_videos_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `biblioteca_visualizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biblioteca_visualizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `biblioteca_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `veces_abierto` int DEFAULT '0',
  `ultimo_segundo_video` int DEFAULT '0',
  `visto_completo` tinyint(1) DEFAULT '0',
  `ultima_visualizacion` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `biblioteca_id` (`biblioteca_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `biblioteca_visualizaciones_ibfk_1` FOREIGN KEY (`biblioteca_id`) REFERENCES `biblioteca` (`id`),
  CONSTRAINT `biblioteca_visualizaciones_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cargas_fisicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cargas_fisicas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `titulo` varchar(150) DEFAULT NULL,
  `archivo_pdf` varchar(255) DEFAULT NULL,
  `peso` decimal(5,2) DEFAULT NULL,
  `altura` decimal(4,2) DEFAULT NULL,
  `distancia_recorrida` decimal(8,2) DEFAULT NULL,
  `sprint_maximo` decimal(5,2) DEFAULT NULL,
  `rpe` int DEFAULT NULL,
  `estado` enum('excelente','bueno','normal','fatigado','lesionado') DEFAULT 'normal',
  `observaciones` text,
  `registrado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `cargas_fisicas_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`),
  CONSTRAINT `cargas_fisicas_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `composicion_corporal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `composicion_corporal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `peso` decimal(5,2) NOT NULL,
  `grasa_corporal_pct` decimal(4,1) DEFAULT NULL,
  `observaciones` text,
  `registrado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `composicion_corporal_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`),
  CONSTRAINT `composicion_corporal_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ejercicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ejercicios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entrenamiento_id` int NOT NULL,
  `numero` int NOT NULL,
  `dia` date DEFAULT NULL,
  `sesion_numero` varchar(20) DEFAULT NULL,
  `turno` varchar(50) DEFAULT NULL,
  `tipo_trabajo` varchar(150) DEFAULT NULL,
  `espacio` varchar(150) DEFAULT NULL,
  `materiales` text,
  `objetivo` text,
  `n_jugadores` varchar(50) DEFAULT NULL,
  `duracion` varchar(50) DEFAULT NULL,
  `descripcion` text,
  `puntuacion` text,
  `entrenador_a_cargo` varchar(150) DEFAULT NULL,
  `jugadores` text,
  `pechera` varchar(150) DEFAULT NULL,
  `dibujo_json` longtext,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ejercicios_entrenamiento_fk` (`entrenamiento_id`),
  KEY `ejercicios_creado_por_fk` (`creado_por`),
  CONSTRAINT `ejercicios_creado_por_fk` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `ejercicios_entrenamiento_fk` FOREIGN KEY (`entrenamiento_id`) REFERENCES `entrenamientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `entrenamiento_jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenamiento_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entrenamiento_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  `asistio` tinyint(1) DEFAULT '1',
  `estado` enum('titular','suplente','diferenciado','lesionado','ausente') DEFAULT 'titular',
  `minutos_entrenados` int DEFAULT NULL,
  `rpe` int DEFAULT NULL,
  `observaciones` text,
  PRIMARY KEY (`id`),
  KEY `entrenamiento_id` (`entrenamiento_id`),
  KEY `jugador_id` (`jugador_id`),
  CONSTRAINT `entrenamiento_jugadores_ibfk_1` FOREIGN KEY (`entrenamiento_id`) REFERENCES `entrenamientos` (`id`),
  CONSTRAINT `entrenamiento_jugadores_ibfk_2` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `entrenamiento_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenamiento_videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entrenamiento_id` int NOT NULL,
  `video_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `entrenamiento_id` (`entrenamiento_id`),
  KEY `video_id` (`video_id`),
  CONSTRAINT `entrenamiento_videos_ibfk_1` FOREIGN KEY (`entrenamiento_id`) REFERENCES `entrenamientos` (`id`),
  CONSTRAINT `entrenamiento_videos_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `entrenamientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenamientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `titulo` varchar(150) DEFAULT NULL,
  `descripcion` text,
  `tipo_entrenamiento` varchar(100) DEFAULT NULL,
  `duracion_minutos` int DEFAULT NULL,
  `cantidad_jugadores` int DEFAULT NULL,
  `objetivo` text,
  `observaciones` text,
  `materiales` text,
  `espacios` varchar(255) DEFAULT NULL,
  `dibujo_url` varchar(255) DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reflexion_dia` date DEFAULT NULL,
  `reflexion_sesion_numero` varchar(20) DEFAULT NULL,
  `reflexion_turno` varchar(50) DEFAULT NULL,
  `reflexion_objetivo` text,
  `reflexion_logro_objetivo` text,
  `reflexion_respuesta_jugadores` text,
  `reflexion_intervencion_ct` text,
  `reflexion_modificaciones` text,
  `reflexion_entrenador_cargo` varchar(150) DEFAULT NULL,
  `reflexion_firma` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `entrenamientos_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `etiquetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etiquetas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `informes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `informes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `entrenador_id` int DEFAULT NULL,
  `fecha` date NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `calificacion_general` int DEFAULT NULL,
  `aspectos_positivos` text,
  `aspectos_a_mejorar` text,
  `objetivos_proxima_semana` text,
  `observaciones` text,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `entrenador_id` (`entrenador_id`),
  CONSTRAINT `informes_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`),
  CONSTRAINT `informes_ibfk_2` FOREIGN KEY (`entrenador_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `edad` int DEFAULT NULL,
  `peso` decimal(5,2) DEFAULT NULL,
  `altura` decimal(4,2) DEFAULT NULL,
  `nacionalidad_1` varchar(60) DEFAULT NULL,
  `nacionalidad_2` varchar(60) DEFAULT NULL,
  `posicion` varchar(50) DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `division_nombre` varchar(100) DEFAULT NULL,
  `contrato` enum('si','no') DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `agente_nombre` varchar(100) DEFAULT NULL,
  `agente_apellido` varchar(100) DEFAULT NULL,
  `agente_mail` varchar(150) DEFAULT NULL,
  `agente_telefono` varchar(50) DEFAULT NULL,
  `contacto_emergencia_nombre` varchar(100) DEFAULT NULL,
  `contacto_emergencia_apellido` varchar(100) DEFAULT NULL,
  `contacto_emergencia_relacion` varchar(100) DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(50) DEFAULT NULL,
  `pie` enum('derecho','izquierdo') DEFAULT NULL,
  `posicion_cancha` varchar(30) DEFAULT NULL,
  `posiciones_cancha` text,
  `minutos_jugados` int DEFAULT NULL,
  `partidos_jugados` int DEFAULT NULL,
  `minutos_por_partido` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `jugadores_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marcador_etiquetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marcador_etiquetas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `marcador_id` int NOT NULL,
  `etiqueta_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `marcador_id` (`marcador_id`),
  KEY `etiqueta_id` (`etiqueta_id`),
  CONSTRAINT `marcador_etiquetas_ibfk_1` FOREIGN KEY (`marcador_id`) REFERENCES `video_marcadores` (`id`),
  CONSTRAINT `marcador_etiquetas_ibfk_2` FOREIGN KEY (`etiqueta_id`) REFERENCES `etiquetas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pizarras_tacticas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pizarras_tacticas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entrenamiento_id` int NOT NULL,
  `nombre` varchar(150) DEFAULT NULL,
  `descripcion` text,
  `datos_json` json NOT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `entrenamiento_id` (`entrenamiento_id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `pizarras_tacticas_ibfk_1` FOREIGN KEY (`entrenamiento_id`) REFERENCES `entrenamientos` (`id`),
  CONSTRAINT `pizarras_tacticas_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rutina_completados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rutina_completados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rutina_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  `completado` tinyint(1) NOT NULL DEFAULT '0',
  `completado_en` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_rutina_completado` (`rutina_id`,`jugador_id`),
  KEY `rutina_completados_jugador_fk` (`jugador_id`),
  CONSTRAINT `rutina_completados_jugador_fk` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rutina_completados_rutina_fk` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rutina_jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rutina_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rutina_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_rutina_jugador` (`rutina_id`,`jugador_id`),
  KEY `rutina_jugadores_jugador_fk` (`jugador_id`),
  CONSTRAINT `rutina_jugadores_jugador_fk` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rutina_jugadores_rutina_fk` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rutina_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rutina_videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rutina_id` int NOT NULL,
  `video_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `rutina_videos_rutina_fk` (`rutina_id`),
  KEY `rutina_videos_video_fk` (`video_id`),
  CONSTRAINT `rutina_videos_rutina_fk` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rutina_videos_video_fk` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rutinas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rutinas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `alcance` enum('general','individual') NOT NULL DEFAULT 'general',
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `rutinas_creado_por_fk` (`creado_por`),
  CONSTRAINT `rutinas_creado_por_fk` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','entrenador','preparador_fisico','jugador') NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `video_etiquetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_etiquetas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_id` int NOT NULL,
  `etiqueta_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `video_id` (`video_id`),
  KEY `etiqueta_id` (`etiqueta_id`),
  CONSTRAINT `video_etiquetas_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`),
  CONSTRAINT `video_etiquetas_ibfk_2` FOREIGN KEY (`etiqueta_id`) REFERENCES `etiquetas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `video_jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  `compartido_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `video_id` (`video_id`),
  KEY `jugador_id` (`jugador_id`),
  CONSTRAINT `video_jugadores_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`),
  CONSTRAINT `video_jugadores_ibfk_2` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `video_marcadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_marcadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_id` int NOT NULL,
  `segundo` int NOT NULL,
  `titulo` varchar(150) DEFAULT NULL,
  `descripcion` text,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `video_id` (`video_id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `video_marcadores_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`),
  CONSTRAINT `video_marcadores_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `tipo` enum('archivo','link') NOT NULL,
  `url_video` text NOT NULL,
  `categoria_video` enum('partido','entrenamiento','individual','rutina','biblioteca') NOT NULL,
  `rival` varchar(100) DEFAULT NULL,
  `resultado` varchar(50) DEFAULT NULL,
  `duracion_segundos` int DEFAULT NULL,
  `fecha_video` date DEFAULT NULL,
  `fecha_subida` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `subido_por` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subido_por` (`subido_por`),
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

