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
  `tipo` enum('analisis','partido') NOT NULL DEFAULT 'partido',
  `analisis_tipo` enum('propio','rival') DEFAULT NULL,
  `plan_partido_json` longtext,
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
  `tipo_trabajo` varchar(150) DEFAULT NULL,
  `espacio` varchar(150) DEFAULT NULL,
  `objetivo` text,
  `n_jugadores` varchar(50) DEFAULT NULL,
  `duracion` varchar(50) DEFAULT NULL,
  `descripcion` text,
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
DROP TABLE IF EXISTS `ejercicios_tacticos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ejercicios_tacticos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoria` varchar(30) NOT NULL,
  `subcategoria` varchar(60) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `fecha` date DEFAULT NULL,
  `descripcion` text,
  `cantidad_jugadores` int DEFAULT NULL,
  `video_tipo` enum('archivo','link') DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `video_nombre_original` varchar(255) DEFAULT NULL,
  `dibujo_json` longtext,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ejercicios_tacticos_creado_por_fk` (`creado_por`),
  CONSTRAINT `ejercicios_tacticos_creado_por_fk` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  `peso` decimal(5,2) DEFAULT NULL,
  `altura` decimal(4,2) DEFAULT NULL,
  `nacionalidad_1` varchar(60) DEFAULT NULL,
  `nacionalidad_2` varchar(60) DEFAULT NULL,
  `nacionalidad_2_tramite` enum('en_curso','finalizado') DEFAULT NULL,
  `posicion` varchar(50) DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `division_nombre` varchar(100) DEFAULT NULL,
  `contrato` enum('si','no') DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `agente_nombre` varchar(100) DEFAULT NULL,
  `agente_apellido` varchar(100) DEFAULT NULL,
  `agente_tipo` enum('persona','empresa') NOT NULL DEFAULT 'persona',
  `agente_empresa` varchar(150) DEFAULT NULL,
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
  `fecha_nacimiento` date DEFAULT NULL,
  `psicologo_id` int DEFAULT NULL,
  `semaforo_psicologico` enum('verde','amarillo','rojo') DEFAULT NULL,
  `semaforo_analisis` enum('verde','amarillo','rojo') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `psicologo_id` (`psicologo_id`),
  CONSTRAINT `jugadores_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `jugadores_ibfk_2` FOREIGN KEY (`psicologo_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lesiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lesiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `lesion` varchar(200) NOT NULL,
  `diagnostico` text,
  `proceso_recuperacion` text,
  `fecha_alta` date DEFAULT NULL,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `lesiones_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesiones_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lesiones_archivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lesiones_archivos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lesion_id` int NOT NULL,
  `tipo_documento` enum('diagnostico','resonancia','estudio','informe','otro') NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `archivo` varchar(500) NOT NULL,
  `subido_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lesion_id` (`lesion_id`),
  KEY `subido_por` (`subido_por`),
  CONSTRAINT `lesiones_archivos_ibfk_1` FOREIGN KEY (`lesion_id`) REFERENCES `lesiones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesiones_archivos_ibfk_2` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
DROP TABLE IF EXISTS `nutricion_evaluaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nutricion_evaluaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `peso` decimal(5,2) NOT NULL,
  `talla` decimal(5,2) NOT NULL,
  `talla_sentado_cm` decimal(5,2) DEFAULT NULL,
  `envergadura_cm` decimal(5,2) DEFAULT NULL,
  `altura_pie_cm` decimal(5,2) DEFAULT NULL,
  `diametro_biacromial` decimal(5,2) DEFAULT NULL,
  `diametro_torax_transverso` decimal(5,2) DEFAULT NULL,
  `diametro_torax_anteroposterior` decimal(5,2) DEFAULT NULL,
  `diametro_biiliocrestideo` decimal(5,2) DEFAULT NULL,
  `diametro_humeral` decimal(5,2) DEFAULT NULL,
  `diametro_femoral` decimal(5,2) DEFAULT NULL,
  `perimetro_cabeza` decimal(5,2) DEFAULT NULL,
  `perimetro_brazo_relajado` decimal(5,2) DEFAULT NULL,
  `perimetro_brazo_flexionado` decimal(5,2) DEFAULT NULL,
  `perimetro_antebrazo` decimal(5,2) DEFAULT NULL,
  `perimetro_torax_mesoesternal` decimal(5,2) DEFAULT NULL,
  `perimetro_cintura` decimal(5,2) DEFAULT NULL,
  `perimetro_caderas` decimal(5,2) DEFAULT NULL,
  `perimetro_muslo_superior` decimal(5,2) DEFAULT NULL,
  `perimetro_muslo_medial` decimal(5,2) DEFAULT NULL,
  `perimetro_pantorrilla` decimal(5,2) DEFAULT NULL,
  `pliegue_triceps` decimal(5,2) NOT NULL,
  `pliegue_subescapular` decimal(5,2) NOT NULL,
  `pliegue_supraespinal` decimal(5,2) NOT NULL,
  `pliegue_abdominal` decimal(5,2) NOT NULL,
  `pliegue_muslo` decimal(5,2) NOT NULL,
  `pliegue_pantorrilla` decimal(5,2) NOT NULL,
  `masa_muscular_kg` decimal(5,2) NOT NULL,
  `masa_adiposa_kg` decimal(5,2) NOT NULL,
  `sumatoria_pliegues` decimal(6,2) NOT NULL,
  `masa_osea_kg` decimal(5,2) NOT NULL,
  `masa_residual_kg` decimal(5,2) DEFAULT NULL,
  `masa_piel_kg` decimal(5,2) DEFAULT NULL,
  `indice_musculo_oseo` decimal(5,2) NOT NULL,
  `observaciones` text,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `nutricion_evaluaciones_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `nutricion_evaluaciones_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `objetivos_nutricionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `objetivos_nutricionales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoria` varchar(100) NOT NULL,
  `peso_min` decimal(5,2) DEFAULT NULL,
  `peso_max` decimal(5,2) DEFAULT NULL,
  `suma_6_pliegues_objetivo` decimal(6,2) DEFAULT NULL,
  `indice_musculo_oseo_objetivo` decimal(5,2) DEFAULT NULL,
  `imc_objetivo` decimal(5,2) DEFAULT NULL,
  `actualizado_por` int DEFAULT NULL,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categoria` (`categoria`),
  KEY `objetivos_nutricionales_actualizado_por_fk` (`actualizado_por`),
  CONSTRAINT `objetivos_nutricionales_actualizado_por_fk` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dietas_jugador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dietas_jugador` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `plan` text,
  `actualizado_por` int DEFAULT NULL,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jugador_id` (`jugador_id`),
  KEY `dietas_jugador_actualizado_por_fk` (`actualizado_por`),
  CONSTRAINT `dietas_jugador_actualizado_por_fk` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `dietas_jugador_jugador_fk` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `perfiles_psicosociales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfiles_psicosociales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `contenido` text,
  `actualizado_por` int DEFAULT NULL,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jugador_id` (`jugador_id`),
  KEY `actualizado_por` (`actualizado_por`),
  CONSTRAINT `perfiles_psicosociales_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `perfiles_psicosociales_ibfk_2` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `informes_psicologicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `informes_psicologicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `informe` text NOT NULL,
  `plan_mejora` text,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `informes_psicologicos_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `informes_psicologicos_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `datos_bigdata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `datos_bigdata` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `partido` varchar(200) NOT NULL,
  `archivo` varchar(500) DEFAULT NULL,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `informe` text,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `datos_bigdata_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `datos_bigdata_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `analisis_futbolistico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analisis_futbolistico` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `tipo` enum('mensual','trimestral','anual') NOT NULL,
  `informe` text NOT NULL,
  `video` varchar(500) DEFAULT NULL,
  `nombre_video` varchar(255) DEFAULT NULL,
  `entrenamientos_recomendados` text,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `analisis_futbolistico_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analisis_futbolistico_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `picos_rendimiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `picos_rendimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `partido` varchar(200) NOT NULL,
  `indicadores` text NOT NULL,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `picos_rendimiento_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `picos_rendimiento_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cargas_preparacion_fisica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cargas_preparacion_fisica` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `entrenamiento_partido` varchar(200) NOT NULL,
  `observaciones` text,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `cargas_preparacion_fisica_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cargas_preparacion_fisica_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `informes_fisicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `informes_fisicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fortalezas` text,
  `debilidades` text,
  `aspectos_mantener` text,
  `aspectos_mejorar` text,
  `actualizado_por` int DEFAULT NULL,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jugador_id` (`jugador_id`),
  KEY `actualizado_por` (`actualizado_por`),
  CONSTRAINT `informes_fisicos_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `informes_fisicos_ibfk_2` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `planes_entrenamiento_extra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planes_entrenamiento_extra` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `archivo` varchar(500) DEFAULT NULL,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `informe` text,
  `registrado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id` (`jugador_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `planes_entrenamiento_extra_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `planes_entrenamiento_extra_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
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
  `fecha` date DEFAULT NULL,
  `descripcion` text,
  `cantidad_jugadores` int DEFAULT NULL,
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
  `rol` enum('admin','entrenador','preparador_fisico','jugador','psicologo') NOT NULL,
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
  `categoria_video` enum('partido','entrenamiento','individual','rutina','biblioteca','ejercicio') NOT NULL,
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
DROP TABLE IF EXISTS `diagnosticos_ia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diagnosticos_ia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jugador_id` int NOT NULL,
  `area` varchar(30) NOT NULL,
  `contenido` text NOT NULL,
  `generado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jugador_id_area` (`jugador_id`,`area`),
  KEY `generado_por` (`generado_por`),
  CONSTRAINT `diagnosticos_ia_ibfk_1` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `diagnosticos_ia_ibfk_2` FOREIGN KEY (`generado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ejercicio_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ejercicio_videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ejercicio_id` int NOT NULL,
  `video_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ejercicio_id` (`ejercicio_id`),
  KEY `video_id` (`video_id`),
  CONSTRAINT `ejercicio_videos_ibfk_1` FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ejercicio_videos_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `microciclos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `microciclos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `nombre` varchar(150) DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fecha_inicio` (`fecha_inicio`),
  KEY `microciclos_creado_por_fk` (`creado_por`),
  CONSTRAINT `microciclos_creado_por_fk` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `microciclo_bloques`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `microciclo_bloques` (
  `id` int NOT NULL AUTO_INCREMENT,
  `microciclo_id` int NOT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time DEFAULT NULL,
  `categoria` enum('preparador_fisico','cuerpo_tecnico') NOT NULL,
  `titulo` varchar(200) DEFAULT NULL,
  `descripcion` text,
  `espacio` varchar(150) DEFAULT NULL,
  `orientacion` varchar(100) DEFAULT NULL,
  `pse` varchar(50) DEFAULT NULL,
  `objetivo` varchar(200) DEFAULT NULL,
  `espacio_trabajo` enum('completa','media','reducido') DEFAULT NULL,
  `jugadores_por_tarea` varchar(100) DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `microciclo_bloques_microciclo_fk` (`microciclo_id`),
  KEY `microciclo_bloques_creado_por_fk` (`creado_por`),
  CONSTRAINT `microciclo_bloques_microciclo_fk` FOREIGN KEY (`microciclo_id`) REFERENCES `microciclos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `microciclo_bloques_creado_por_fk` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

