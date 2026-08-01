const db = require("../config/db");
const { guardarArchivoDesdeRuta, servirArchivo, eliminarArchivo } = require("../config/storage");

const sinExtension = (nombreArchivo) => nombreArchivo.replace(/\.[^/.]+$/, "");

const jugadorIdDeUsuario = async (usuarioId) => {
  const [jugadores] = await db.query("SELECT id FROM jugadores WHERE usuario_id = ?", [usuarioId]);
  return jugadores[0]?.id || null;
};

// Alta de un entrenamiento desglosado: video corto de un ejercicio ya
// realizado en la cancha, con su dinámica y cantidad de jugadores. Puede
// ser general (todo el plantel) o individual (jugadores puntuales).
const crearRutina = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { titulo, fecha, descripcion, cantidad_jugadores, alcance, url_video } = req.body;
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
      return res.status(400).json({ message: "Elegí al menos un jugador para un entrenamiento individual" });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO rutinas (titulo, fecha, descripcion, cantidad_jugadores, alcance, creado_por) VALUES (?, ?, ?, ?, ?, ?)",
      [titulo, fecha || null, descripcion || null, cantidad_jugadores || null, alcanceFinal, creadoPor]
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
      const urlVideo = await guardarArchivoDesdeRuta(archivo.path, "videos", archivo.originalname);
      const [videoResult] = await conn.query(
        `INSERT INTO videos (titulo, tipo, url_video, categoria_video, subido_por)
         VALUES (?, 'archivo', ?, 'rutina', ?)`,
        [titulo, urlVideo, creadoPor]
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

    res.status(201).json({ message: "Entrenamiento desglosado creado correctamente", rutina_id: rutinaId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: "Error al crear el entrenamiento desglosado", error: error.message });
  } finally {
    conn.release();
  }
};

// Listado para el cuerpo técnico: todos los entrenamientos desglosados.
const listarRutinasStaff = async (req, res) => {
  try {
    const [rutinas] = await db.query(
      `SELECT r.id, r.titulo, r.fecha, r.cantidad_jugadores, r.alcance, r.creado_en,
              (SELECT COUNT(*) FROM rutina_jugadores rj WHERE rj.rutina_id = r.id) AS asignados
       FROM rutinas r
       ORDER BY r.fecha DESC, r.id DESC`
    );
    res.json(rutinas);
  } catch (error) {
    res.status(500).json({ message: "Error al listar los entrenamientos desglosados", error: error.message });
  }
};

// Detalle para el cuerpo técnico: datos + videos + jugadores a los que
// corresponde (si es individual).
const obtenerRutinaStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const [rutinas] = await db.query("SELECT * FROM rutinas WHERE id = ?", [id]);
    if (rutinas.length === 0) {
      return res.status(404).json({ message: "Entrenamiento desglosado no encontrado" });
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
            `SELECT j.id, j.nombre, j.apellido
             FROM jugadores j
             JOIN rutina_jugadores rj ON rj.jugador_id = j.id AND rj.rutina_id = ?
             ORDER BY j.apellido, j.nombre`,
            [id]
          )
        : await db.query(
            `SELECT j.id, j.nombre, j.apellido
             FROM jugadores j
             WHERE j.usuario_id IS NOT NULL
             ORDER BY j.apellido, j.nombre`
          );

    res.json({ ...rutina, videos, jugadores });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el entrenamiento desglosado", error: error.message });
  }
};

// Elimina el entrenamiento desglosado completo (en cascada por FK: asignaciones y videos).
const eliminarRutina = async (req, res) => {
  try {
    const { id } = req.params;

    const [rutinas] = await db.query("SELECT id FROM rutinas WHERE id = ?", [id]);
    if (rutinas.length === 0) {
      return res.status(404).json({ message: "Entrenamiento desglosado no encontrado" });
    }

    const [videos] = await db.query(
      `SELECT v.id, v.tipo, v.url_video FROM rutina_videos rv JOIN videos v ON v.id = rv.video_id WHERE rv.rutina_id = ?`,
      [id]
    );

    await db.query("DELETE FROM rutinas WHERE id = ?", [id]);
    for (const video of videos) {
      await db.query("DELETE FROM videos WHERE id = ?", [video.id]);
      if (video.tipo === "archivo") {
        eliminarArchivo(video.url_video);
      }
    }

    res.json({ message: "Entrenamiento desglosado eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el entrenamiento desglosado", error: error.message });
  }
};

// Listado para el jugador: entrenamientos generales + los individuales asignados a él.
const listarRutinasJugador = async (req, res) => {
  try {
    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);
    if (!jugadorId) {
      return res.json([]);
    }

    const [rutinas] = await db.query(
      `SELECT r.id, r.titulo, r.fecha, r.descripcion, r.cantidad_jugadores, r.creado_en
       FROM rutinas r
       WHERE r.alcance = 'general'
          OR EXISTS (SELECT 1 FROM rutina_jugadores rj WHERE rj.rutina_id = r.id AND rj.jugador_id = ?)
       ORDER BY r.fecha DESC, r.id DESC`,
      [jugadorId]
    );

    res.json(rutinas);
  } catch (error) {
    res.status(500).json({ message: "Error al listar los entrenamientos desglosados", error: error.message });
  }
};

// Detalle para el jugador (solo si el entrenamiento le corresponde).
const obtenerRutinaJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);

    const [rutinas] = await db.query(
      `SELECT r.id, r.titulo, r.fecha, r.descripcion, r.cantidad_jugadores, r.alcance, r.creado_en
       FROM rutinas r
       WHERE r.id = ?
         AND (r.alcance = 'general'
              OR EXISTS (SELECT 1 FROM rutina_jugadores rj WHERE rj.rutina_id = r.id AND rj.jugador_id = ?))`,
      [id, jugadorId]
    );

    if (rutinas.length === 0) {
      return res.status(404).json({ message: "Entrenamiento desglosado no encontrado" });
    }

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.tipo, v.url_video
       FROM rutina_videos rv JOIN videos v ON v.id = rv.video_id
       WHERE rv.rutina_id = ?`,
      [id]
    );

    res.json({ ...rutinas[0], videos });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el entrenamiento desglosado", error: error.message });
  }
};

// Sirve el archivo de video de un entrenamiento desglosado.
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

    await servirArchivo(req, res, videos[0].url_video);
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
  obtenerArchivoVideo,
};
