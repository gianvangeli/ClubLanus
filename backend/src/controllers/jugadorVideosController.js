const db = require("../config/db");
const { guardarArchivoDesdeRuta, servirArchivo, eliminarArchivo } = require("../config/storage");
const { notificarJugador } = require("../config/notificaciones");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Sube un video personal a la ficha de un jugador puntual (sin paso de
// asignación: siempre es de ese jugador). Admite archivo subido o link
// externo, igual que agregarVideoABiblioteca.
const subirVideoJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const subidoPor = req.usuario.id;
    const { titulo, descripcion, url_video } = req.body;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    let tipo;
    let urlFinal;

    if (req.file) {
      tipo = "archivo";
      urlFinal = await guardarArchivoDesdeRuta(req.file.path, "videos", req.file.originalname);
    } else if (url_video) {
      tipo = "link";
      urlFinal = url_video;
    }

    if (!titulo || !urlFinal) {
      return res.status(400).json({
        message: "Faltan datos obligatorios: título, y un archivo de video o un link",
      });
    }

    const [videoResult] = await db.query(
      `INSERT INTO videos (titulo, descripcion, tipo, url_video, categoria_video, subido_por)
       VALUES (?, ?, ?, ?, 'individual', ?)`,
      [titulo, descripcion || null, tipo, urlFinal, subidoPor]
    );
    const videoId = videoResult.insertId;

    await db.query("INSERT INTO jugador_videos (jugador_id, video_id, subido_por) VALUES (?, ?, ?)", [
      id,
      videoId,
      subidoPor,
    ]);

    await notificarJugador(id, "video_individual", "Se subió un nuevo video", "/mis-videos");

    res.status(201).json({
      message: "Video subido correctamente",
      video_id: videoId,
      tipo,
      url_video: urlFinal,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al subir el video",
      error: error.message,
    });
  }
};

// Listado para la ficha (cuerpo técnico).
const listarVideosJugador = async (req, res) => {
  try {
    const { id } = req.params;

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.descripcion, v.tipo, v.url_video, jv.creado_en
       FROM jugador_videos jv
       JOIN videos v ON v.id = jv.video_id
       WHERE jv.jugador_id = ?
       ORDER BY jv.id DESC`,
      [id]
    );

    res.json(videos);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los videos del jugador",
      error: error.message,
    });
  }
};

// El jugador ve sus propios videos (resuelto a partir de su cuenta).
const listarMisVideos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE usuario_id = ?", [usuarioId]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "No se encontró tu ficha de jugador" });
    }

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.descripcion, v.tipo, v.url_video, jv.creado_en
       FROM jugador_videos jv
       JOIN videos v ON v.id = jv.video_id
       WHERE jv.jugador_id = ?
       ORDER BY jv.id DESC`,
      [jugadores[0].id]
    );

    res.json(videos);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener tus videos",
      error: error.message,
    });
  }
};

// Sirve el archivo. Cuerpo técnico siempre puede; el jugador solo si el
// video es suyo.
const obtenerArchivoVideoJugador = async (req, res) => {
  try {
    const { videoId } = req.params;
    const usuario = req.usuario;

    const [videos] = await db.query("SELECT id, tipo, url_video FROM videos WHERE id = ?", [videoId]);
    if (videos.length === 0) {
      return res.status(404).json({ message: "Video no encontrado" });
    }

    const video = videos[0];
    if (video.tipo !== "archivo") {
      return res.status(400).json({ message: "Este video es un link externo, no un archivo subido" });
    }

    if (!CUERPO_TECNICO.includes(usuario.rol)) {
      const [acceso] = await db.query(
        `SELECT 1
         FROM jugador_videos jv
         JOIN jugadores j ON j.id = jv.jugador_id
         WHERE jv.video_id = ? AND j.usuario_id = ?
         LIMIT 1`,
        [videoId, usuario.id]
      );

      if (acceso.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a este video" });
      }
    }

    await servirArchivo(req, res, video.url_video);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el video",
      error: error.message,
    });
  }
};

// Elimina un video individual: nunca se comparte con otra sección, así que
// se borra directo (fila de jugador_videos, fila de videos y el archivo).
const eliminarVideoJugador = async (req, res) => {
  try {
    const { id, videoId } = req.params;

    const [existentes] = await db.query(
      "SELECT tipo, url_video FROM jugador_videos jv JOIN videos v ON v.id = jv.video_id WHERE jv.jugador_id = ? AND jv.video_id = ?",
      [id, videoId]
    );
    if (existentes.length === 0) {
      return res.status(404).json({ message: "Video no encontrado" });
    }

    await db.query("DELETE FROM jugador_videos WHERE jugador_id = ? AND video_id = ?", [id, videoId]);
    await db.query("DELETE FROM videos WHERE id = ?", [videoId]);

    if (existentes[0].tipo === "archivo") {
      eliminarArchivo(existentes[0].url_video);
    }

    res.json({ message: "Video eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el video",
      error: error.message,
    });
  }
};

module.exports = {
  subirVideoJugador,
  listarVideosJugador,
  listarMisVideos,
  obtenerArchivoVideoJugador,
  eliminarVideoJugador,
};
