const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const sinExtension = (nombreArchivo) => nombreArchivo.replace(/\.[^/.]+$/, "");

const jugadorIdDeUsuario = async (usuarioId) => {
  const [jugadores] = await db.query("SELECT id FROM jugadores WHERE usuario_id = ?", [usuarioId]);
  return jugadores[0]?.id || null;
};

// Alta de una rutina (entrenamiento extra para trabajar fuera del club).
// Puede ser general (todo el plantel) o individual (jugadores puntuales).
const crearRutina = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { titulo, descripcion, alcance, url_video } = req.body;
    const jugadorIds = (Array.isArray(req.body.jugador_ids) ? req.body.jugador_ids : [req.body.jugador_ids])
      .filter(Boolean)
      .map(Number);
    const creadoPor = req.usuario.id;
    const archivo = (req.files || [])[0];

    if (!titulo) {
      return res.status(400).json({ message: "El título es obligatorio" });
    }

    const alcanceFinal = alcance === "individual" ? "individual" : "general";

    if (alcanceFinal === "individual" && jugadorIds.length === 0) {
      return res.status(400).json({ message: "Elegí al menos un jugador para una rutina individual" });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO rutinas (titulo, descripcion, alcance, creado_por) VALUES (?, ?, ?, ?)",
      [titulo, descripcion || null, alcanceFinal, creadoPor]
    );
    const rutinaId = result.insertId;

    if (alcanceFinal === "individual") {
      for (const jugadorId of jugadorIds) {
        await conn.query("INSERT INTO rutina_jugadores (rutina_id, jugador_id) VALUES (?, ?)", [
          rutinaId,
          jugadorId,
        ]);
      }
    }

    if (archivo) {
      const [videoResult] = await conn.query(
        `INSERT INTO videos (titulo, tipo, url_video, categoria_video, subido_por)
         VALUES (?, 'archivo', ?, 'rutina', ?)`,
        [titulo, `/uploads/videos/${archivo.filename}`, creadoPor]
      );
      await conn.query("INSERT INTO rutina_videos (rutina_id, video_id) VALUES (?, ?)", [
        rutinaId,
        videoResult.insertId,
      ]);
    } else if (url_video && url_video.trim()) {
      const [videoResult] = await conn.query(
        `INSERT INTO videos (titulo, tipo, url_video, categoria_video, subido_por)
         VALUES (?, 'link', ?, 'rutina', ?)`,
        [titulo, url_video.trim(), creadoPor]
      );
      await conn.query("INSERT INTO rutina_videos (rutina_id, video_id) VALUES (?, ?)", [
        rutinaId,
        videoResult.insertId,
      ]);
    }

    await conn.commit();

    res.status(201).json({ message: "Rutina creada correctamente", rutina_id: rutinaId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: "Error al crear la rutina", error: error.message });
  } finally {
    conn.release();
  }
};

// Listado para el cuerpo técnico: todas las rutinas con su avance de cumplimiento.
const listarRutinasStaff = async (req, res) => {
  try {
    const [rutinas] = await db.query(
      `SELECT r.id, r.titulo, r.descripcion, r.alcance, r.creado_en,
              (SELECT COUNT(*) FROM rutina_jugadores rj WHERE rj.rutina_id = r.id) AS asignados,
              (SELECT COUNT(*) FROM rutina_completados rc WHERE rc.rutina_id = r.id AND rc.completado = 1) AS completados
       FROM rutinas r
       ORDER BY r.creado_en DESC, r.id DESC`
    );
    res.json(rutinas);
  } catch (error) {
    res.status(500).json({ message: "Error al listar las rutinas", error: error.message });
  }
};

// Detalle para el cuerpo técnico: datos + videos + estado de cada jugador
// que le corresponde (asignados si es individual, todo el plantel si es general).
const obtenerRutinaStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const [rutinas] = await db.query("SELECT * FROM rutinas WHERE id = ?", [id]);
    if (rutinas.length === 0) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }
    const rutina = rutinas[0];

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.tipo, v.url_video
       FROM rutina_videos rv JOIN videos v ON v.id = rv.video_id
       WHERE rv.rutina_id = ?`,
      [id]
    );

    const [jugadores] =
      rutina.alcance === "individual"
        ? await db.query(
            `SELECT j.id, j.nombre, j.apellido, rc.completado, rc.completado_en
             FROM jugadores j
             JOIN rutina_jugadores rj ON rj.jugador_id = j.id AND rj.rutina_id = ?
             LEFT JOIN rutina_completados rc ON rc.jugador_id = j.id AND rc.rutina_id = ?
             ORDER BY j.apellido, j.nombre`,
            [id, id]
          )
        : await db.query(
            `SELECT j.id, j.nombre, j.apellido, rc.completado, rc.completado_en
             FROM jugadores j
             LEFT JOIN rutina_completados rc ON rc.jugador_id = j.id AND rc.rutina_id = ?
             WHERE j.usuario_id IS NOT NULL
             ORDER BY j.apellido, j.nombre`,
            [id]
          );

    res.json({ ...rutina, videos, jugadores });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la rutina", error: error.message });
  }
};

// Elimina la rutina completa (en cascada por FK: asignaciones, videos y completados).
const eliminarRutina = async (req, res) => {
  try {
    const { id } = req.params;

    const [rutinas] = await db.query("SELECT id FROM rutinas WHERE id = ?", [id]);
    if (rutinas.length === 0) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const [videos] = await db.query(
      `SELECT v.id, v.tipo, v.url_video FROM rutina_videos rv JOIN videos v ON v.id = rv.video_id WHERE rv.rutina_id = ?`,
      [id]
    );

    await db.query("DELETE FROM rutinas WHERE id = ?", [id]);
    for (const video of videos) {
      await db.query("DELETE FROM videos WHERE id = ?", [video.id]);
      if (video.tipo === "archivo") {
        fs.unlink(path.join(__dirname, "..", "..", video.url_video), () => {});
      }
    }

    res.json({ message: "Rutina eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la rutina", error: error.message });
  }
};

// Listado para el jugador: rutinas generales + las individuales asignadas a él,
// con su propio estado de cumplimiento.
const listarRutinasJugador = async (req, res) => {
  try {
    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);
    if (!jugadorId) {
      return res.json([]);
    }

    const [rutinas] = await db.query(
      `SELECT r.id, r.titulo, r.descripcion, r.creado_en,
              COALESCE(rc.completado, 0) AS completado, rc.completado_en
       FROM rutinas r
       LEFT JOIN rutina_completados rc ON rc.rutina_id = r.id AND rc.jugador_id = ?
       WHERE r.alcance = 'general'
          OR EXISTS (SELECT 1 FROM rutina_jugadores rj WHERE rj.rutina_id = r.id AND rj.jugador_id = ?)
       ORDER BY r.creado_en DESC, r.id DESC`,
      [jugadorId, jugadorId]
    );

    res.json(rutinas);
  } catch (error) {
    res.status(500).json({ message: "Error al listar las rutinas", error: error.message });
  }
};

// Detalle para el jugador (solo si la rutina le corresponde).
const obtenerRutinaJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);

    const [rutinas] = await db.query(
      `SELECT r.id, r.titulo, r.descripcion, r.alcance, r.creado_en,
              COALESCE(rc.completado, 0) AS completado, rc.completado_en
       FROM rutinas r
       LEFT JOIN rutina_completados rc ON rc.rutina_id = r.id AND rc.jugador_id = ?
       WHERE r.id = ?
         AND (r.alcance = 'general'
              OR EXISTS (SELECT 1 FROM rutina_jugadores rj WHERE rj.rutina_id = r.id AND rj.jugador_id = ?))`,
      [jugadorId, id, jugadorId]
    );

    if (rutinas.length === 0) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.tipo, v.url_video
       FROM rutina_videos rv JOIN videos v ON v.id = rv.video_id
       WHERE rv.rutina_id = ?`,
      [id]
    );

    res.json({ ...rutinas[0], videos });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la rutina", error: error.message });
  }
};

// El jugador marca (o desmarca) una rutina como completada.
const actualizarCompletado = async (req, res) => {
  try {
    const { id } = req.params;
    const { completado } = req.body;
    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);

    if (!jugadorId) {
      return res.status(404).json({ message: "No hay una ficha de jugador vinculada a esta cuenta" });
    }

    const [rutinas] = await db.query(
      `SELECT r.id FROM rutinas r
       WHERE r.id = ?
         AND (r.alcance = 'general'
              OR EXISTS (SELECT 1 FROM rutina_jugadores rj WHERE rj.rutina_id = r.id AND rj.jugador_id = ?))`,
      [id, jugadorId]
    );
    if (rutinas.length === 0) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const completadoBool = completado ? 1 : 0;

    await db.query(
      `INSERT INTO rutina_completados (rutina_id, jugador_id, completado, completado_en)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE completado = VALUES(completado), completado_en = VALUES(completado_en)`,
      [id, jugadorId, completadoBool, completadoBool ? new Date() : null]
    );

    res.json({ message: "Estado actualizado correctamente", completado: Boolean(completadoBool) });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el estado", error: error.message });
  }
};

// Sirve el archivo de video de una rutina.
const obtenerArchivoVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const esCuerpoTecnico = ["admin", "entrenador", "preparador_fisico"].includes(req.usuario.rol);

    const [videos] = await db.query(
      "SELECT tipo, url_video FROM videos WHERE id = ? AND categoria_video = 'rutina'",
      [videoId]
    );
    if (videos.length === 0 || videos[0].tipo !== "archivo") {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    if (!esCuerpoTecnico) {
      const jugadorId = await jugadorIdDeUsuario(req.usuario.id);
      const [rutinas] = await db.query(
        `SELECT r.id FROM rutina_videos rv
         JOIN rutinas r ON r.id = rv.rutina_id
         WHERE rv.video_id = ?
           AND (r.alcance = 'general'
                OR EXISTS (SELECT 1 FROM rutina_jugadores rj WHERE rj.rutina_id = r.id AND rj.jugador_id = ?))`,
        [videoId, jugadorId]
      );
      if (rutinas.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a este video" });
      }
    }

    const rutaArchivo = path.join(__dirname, "..", "..", videos[0].url_video);
    res.sendFile(rutaArchivo, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: "Archivo no encontrado en el servidor" });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el archivo", error: error.message });
  }
};

module.exports = {
  crearRutina,
  listarRutinasStaff,
  obtenerRutinaStaff,
  eliminarRutina,
  listarRutinasJugador,
  obtenerRutinaJugador,
  actualizarCompletado,
  obtenerArchivoVideo,
};
