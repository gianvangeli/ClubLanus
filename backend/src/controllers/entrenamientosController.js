const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const sinExtension = (nombreArchivo) => nombreArchivo.replace(/\.[^/.]+$/, "");

// Crea la sesión del día (o reutiliza la que ya existe para esa fecha) y le
// agrega los videos subidos en la misma carga. Pensado para un uso rápido:
// el cuerpo técnico elige la fecha (por defecto hoy) y sube 1 o 2 videos.
const crearEntrenamiento = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { fecha, descripcion, titulo, url_video } = req.body;
    const creadoPor = req.usuario.id;
    const fechaSesion = fecha || new Date().toISOString().slice(0, 10);

    const videosACrear = [];

    for (const archivo of req.files || []) {
      videosACrear.push({
        titulo: titulo || sinExtension(archivo.originalname),
        tipo: "archivo",
        url_video: `/uploads/videos/${archivo.filename}`,
      });
    }

    const urls = (Array.isArray(url_video) ? url_video : [url_video])
      .flatMap((valor) => (valor ? valor.split("\n") : []))
      .map((valor) => valor.trim())
      .filter(Boolean);

    urls.forEach((url, i) => {
      videosACrear.push({
        titulo: titulo || (urls.length > 1 ? `Video ${i + 1}` : url),
        tipo: "link",
        url_video: url,
      });
    });

    if (videosACrear.length === 0) {
      return res.status(400).json({
        message: "Subí al menos un archivo o un link de video",
      });
    }

    await conn.beginTransaction();

    const [existentes] = await conn.query(
      "SELECT id FROM entrenamientos WHERE fecha = ?",
      [fechaSesion]
    );

    let entrenamientoId;
    if (existentes.length > 0) {
      entrenamientoId = existentes[0].id;
      if (descripcion) {
        await conn.query("UPDATE entrenamientos SET descripcion = ? WHERE id = ?", [
          descripcion,
          entrenamientoId,
        ]);
      }
    } else {
      const [result] = await conn.query(
        "INSERT INTO entrenamientos (fecha, descripcion, creado_por) VALUES (?, ?, ?)",
        [fechaSesion, descripcion || null, creadoPor]
      );
      entrenamientoId = result.insertId;
    }

    for (const video of videosACrear) {
      const [videoResult] = await conn.query(
        `INSERT INTO videos (titulo, tipo, url_video, categoria_video, fecha_video, subido_por)
         VALUES (?, ?, ?, 'entrenamiento', ?, ?)`,
        [video.titulo, video.tipo, video.url_video, fechaSesion, creadoPor]
      );

      await conn.query(
        "INSERT INTO entrenamiento_videos (entrenamiento_id, video_id) VALUES (?, ?)",
        [entrenamientoId, videoResult.insertId]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: `${videosACrear.length} video(s) agregado(s) correctamente`,
      entrenamiento_id: entrenamientoId,
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      message: "Error al registrar el entrenamiento",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// Agenda: una fila por día con sesión cargada, más reciente primero.
const listarEntrenamientos = async (req, res) => {
  try {
    const [entrenamientos] = await db.query(
      `SELECT e.id, e.fecha, e.descripcion, e.creado_en,
              (SELECT COUNT(*) FROM entrenamiento_videos ev WHERE ev.entrenamiento_id = e.id) AS cantidad_videos
       FROM entrenamientos e
       ORDER BY e.fecha DESC, e.id DESC`
    );

    res.json(entrenamientos);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los entrenamientos",
      error: error.message,
    });
  }
};

const obtenerEntrenamiento = async (req, res) => {
  try {
    const { id } = req.params;

    const [entrenamientos] = await db.query(
      "SELECT id, fecha, descripcion, creado_en FROM entrenamientos WHERE id = ?",
      [id]
    );

    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.tipo, v.url_video, v.fecha_video
       FROM entrenamiento_videos ev
       JOIN videos v ON v.id = ev.video_id
       WHERE ev.entrenamiento_id = ?
       ORDER BY v.id DESC`,
      [id]
    );

    res.json({ ...entrenamientos[0], videos });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el entrenamiento",
      error: error.message,
    });
  }
};

// Elimina un video puntual de una sesión (por si se subió el archivo equivocado).
const eliminarVideoEntrenamiento = async (req, res) => {
  try {
    const { videoId } = req.params;

    const [videos] = await db.query("SELECT tipo, url_video FROM videos WHERE id = ?", [videoId]);
    if (videos.length === 0) {
      return res.status(404).json({ message: "Video no encontrado" });
    }

    await db.query("DELETE FROM entrenamiento_videos WHERE video_id = ?", [videoId]);
    await db.query("DELETE FROM videos WHERE id = ?", [videoId]);

    if (videos[0].tipo === "archivo") {
      fs.unlink(path.join(__dirname, "..", "..", videos[0].url_video), () => {});
    }

    res.json({ message: "Video eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el video",
      error: error.message,
    });
  }
};

// Elimina la sesión completa junto con todos sus videos.
const eliminarEntrenamiento = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    const [entrenamientos] = await conn.query("SELECT id FROM entrenamientos WHERE id = ?", [id]);
    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    const [videos] = await conn.query(
      `SELECT v.id, v.tipo, v.url_video
       FROM entrenamiento_videos ev
       JOIN videos v ON v.id = ev.video_id
       WHERE ev.entrenamiento_id = ?`,
      [id]
    );

    await conn.beginTransaction();
    await conn.query("DELETE FROM entrenamiento_videos WHERE entrenamiento_id = ?", [id]);
    for (const video of videos) {
      await conn.query("DELETE FROM videos WHERE id = ?", [video.id]);
    }
    await conn.query("DELETE FROM entrenamientos WHERE id = ?", [id]);
    await conn.commit();

    for (const video of videos) {
      if (video.tipo === "archivo") {
        fs.unlink(path.join(__dirname, "..", "..", video.url_video), () => {});
      }
    }

    res.json({ message: "Entrenamiento eliminado correctamente" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      message: "Error al eliminar el entrenamiento",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// Sirve el archivo de un video de entrenamiento. Accesible para cualquier
// usuario autenticado (todo el plantel puede ver los videos del día).
const obtenerArchivoVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const [videos] = await db.query(
      "SELECT tipo, url_video FROM videos WHERE id = ? AND categoria_video = 'entrenamiento'",
      [videoId]
    );

    if (videos.length === 0 || videos[0].tipo !== "archivo") {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    const rutaArchivo = path.join(__dirname, "..", "..", videos[0].url_video);
    res.sendFile(rutaArchivo, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: "Archivo no encontrado en el servidor" });
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

module.exports = {
  crearEntrenamiento,
  listarEntrenamientos,
  obtenerEntrenamiento,
  eliminarVideoEntrenamiento,
  eliminarEntrenamiento,
  obtenerArchivoVideo,
};
