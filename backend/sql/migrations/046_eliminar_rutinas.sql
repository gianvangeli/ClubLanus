-- "Entrenamientos desglosados" pasa a ser 100% exclusivo del cuerpo
-- técnico. La pestaña "General" (con su distinción general/individual para
-- jugadores, tabla `rutinas`) queda sin sentido y se elimina por completo.
--
-- IMPORTANTE: antes de correr esta migración hay que borrar del storage
-- (B2/disco) los archivos de video referenciados por `rutina_videos` (ver
-- script de limpieza ejecutado aparte con `eliminarArchivo` de
-- config/storage.js), porque este DROP no borra los archivos, solo las filas.
DROP TABLE IF EXISTS rutina_jugadores;
DROP TABLE IF EXISTS rutina_videos;
DROP TABLE IF EXISTS rutinas;
