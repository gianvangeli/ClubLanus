const db = require("../config/db");
const { guardarArchivoDesdeRuta, servirArchivo, eliminarArchivo } = require("../config/storage");
const { notificarCuerpoTecnico, notificarJugador } = require("../config/notificaciones");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

const sinExtension = (nombreArchivo) => nombreArchivo.replace(/\.[^/.]+$/, "");

const jugadorIdDeUsuario = async (usuarioId) => {
  const [jugadores] = await db.query("SELECT id FROM jugadores WHERE usuario_id = ?", [usuarioId]);
  return jugadores[0]?.id || null;
};

// El jugador solo debe ver fecha + video de cada sesión (el título ahora se
// calcula en el frontend a partir de la fecha): los datos de planificación
// (objetivo, observaciones, materiales, espacios, dibujo táctico, cantidad
// de jugadores) quedan reservados al cuerpo técnico. `acceso` indica si el
// jugador ya puede ver los videos de esa sesión (ver entrenamiento_accesos).
const paraJugador = (entrenamiento) => {
  const { id, fecha, cantidad_videos, creado_en, acceso } = entrenamiento;
  return { id, fecha, cantidad_videos, creado_en, acceso: acceso || "sin_solicitud" };
};

const extraerVideosDelBody = async (req, tituloVideo) => {
  const videosACrear = [];

  for (const archivo of req.files?.videos || []) {
    videosACrear.push({
      titulo: tituloVideo || sinExtension(archivo.originalname),
      tipo: "archivo",
      url_video: await guardarArchivoDesdeRuta(archivo.path, "videos", archivo.originalname),
    });
  }

  const urls = (Array.isArray(req.body.url_video) ? req.body.url_video : [req.body.url_video])
    .flatMap((valor) => (valor ? valor.split("\n") : []))
    .map((valor) => valor.trim())
    .filter(Boolean);

  urls.forEach((url, i) => {
    videosACrear.push({
      titulo: tituloVideo || (urls.length > 1 ? `Video ${i + 1}` : url),
      tipo: "link",
      url_video: url,
    });
  });

  return videosACrear;
};

// Crea la sesión del día (o reutiliza la que ya existe para esa fecha) y le
// agrega los videos subidos en la misma carga. Pensado para un uso rápido:
// el cuerpo técnico elige la fecha (por defecto hoy) y sube 1 o 2 videos;
// después puede completar el resto desde la página propia de la sesión.
// La planificación (tipo, objetivo, materiales, etc.) ya no vive acá: se
// carga ejercicio por ejercicio (ver ejerciciosController.js).
const crearEntrenamiento = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { fecha, descripcion, titulo_video } = req.body;
    const creadoPor = req.usuario.id;
    const fechaSesion = fecha || new Date().toISOString().slice(0, 10);
    const videosACrear = await extraerVideosDelBody(req, titulo_video);

    await conn.beginTransaction();

    const [existentes] = await conn.query("SELECT id FROM entrenamientos WHERE fecha = ?", [fechaSesion]);

    let entrenamientoId;
    if (existentes.length > 0) {
      entrenamientoId = existentes[0].id;
      await conn.query(`UPDATE entrenamientos SET descripcion = COALESCE(?, descripcion) WHERE id = ?`, [
        descripcion || null,
        entrenamientoId,
      ]);
    } else {
      const [result] = await conn.query(
        `INSERT INTO entrenamientos (fecha, descripcion, creado_por) VALUES (?, ?, ?)`,
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
      message: "Sesión guardada correctamente",
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

// Edita los datos de una sesión ya existente (título, descripción) y
// opcionalmente agrega más videos. Es la página propia de cada
// entrenamiento: acá el cuerpo técnico completa o corrige lo que cargó
// rápido desde la agenda.
const actualizarEntrenamiento = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { descripcion, titulo_video } = req.body;
    const creadoPor = req.usuario.id;
    const videosACrear = await extraerVideosDelBody(req, titulo_video);

    const [existentes] = await conn.query("SELECT id, fecha FROM entrenamientos WHERE id = ?", [id]);
    if (existentes.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    await conn.beginTransaction();

    await conn.query(`UPDATE entrenamientos SET descripcion = ? WHERE id = ?`, [descripcion || null, id]);

    for (const video of videosACrear) {
      const [videoResult] = await conn.query(
        `INSERT INTO videos (titulo, tipo, url_video, categoria_video, fecha_video, subido_por)
         VALUES (?, ?, ?, 'entrenamiento', ?, ?)`,
        [video.titulo, video.tipo, video.url_video, existentes[0].fecha, creadoPor]
      );

      await conn.query(
        "INSERT INTO entrenamiento_videos (entrenamiento_id, video_id) VALUES (?, ?)",
        [id, videoResult.insertId]
      );
    }

    await conn.commit();

    res.json({ message: "Entrenamiento actualizado correctamente" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      message: "Error al actualizar el entrenamiento",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// Agenda: una fila por día con sesión cargada, más reciente primero. El
// jugador solo recibe fecha + cantidad de videos + su estado de acceso
// (sin_solicitud/pendiente/aprobado/rechazado); el CT además ve cuántas
// solicitudes de acceso tiene cada sesión sin resolver.
const listarEntrenamientos = async (req, res) => {
  try {
    const esCuerpoTecnico = CUERPO_TECNICO.includes(req.usuario.rol);

    if (esCuerpoTecnico) {
      const [entrenamientos] = await db.query(
        `SELECT e.id, e.fecha, e.descripcion, e.creado_en,
                (SELECT COUNT(*) FROM entrenamiento_videos ev WHERE ev.entrenamiento_id = e.id) AS cantidad_videos,
                (SELECT COUNT(*) FROM entrenamiento_accesos ea WHERE ea.entrenamiento_id = e.id AND ea.estado = 'pendiente') AS solicitudes_pendientes
         FROM entrenamientos e
         ORDER BY e.fecha DESC, e.id DESC`
      );
      return res.json(entrenamientos);
    }

    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);
    const [entrenamientos] = await db.query(
      `SELECT e.id, e.fecha, e.creado_en,
              (SELECT COUNT(*) FROM entrenamiento_videos ev WHERE ev.entrenamiento_id = e.id) AS cantidad_videos,
              ea.estado AS acceso
       FROM entrenamientos e
       LEFT JOIN entrenamiento_accesos ea ON ea.entrenamiento_id = e.id AND ea.jugador_id = ?
       ORDER BY e.fecha DESC, e.id DESC`,
      [jugadorId]
    );

    res.json(entrenamientos.map(paraJugador));
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los entrenamientos",
      error: error.message,
    });
  }
};

// Página propia de un entrenamiento. El cuerpo técnico ve todo; el jugador
// solo ve los videos si tiene el acceso aprobado (ver entrenamiento_accesos).
const obtenerEntrenamiento = async (req, res) => {
  try {
    const { id } = req.params;
    const esCuerpoTecnico = CUERPO_TECNICO.includes(req.usuario.rol);

    const [entrenamientos] = await db.query(
      `SELECT id, fecha, descripcion, creado_en FROM entrenamientos WHERE id = ?`,
      [id]
    );

    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    if (esCuerpoTecnico) {
      const [videos] = await db.query(
        `SELECT v.id, v.titulo, v.tipo, v.url_video, v.fecha_video
         FROM entrenamiento_videos ev
         JOIN videos v ON v.id = ev.video_id
         WHERE ev.entrenamiento_id = ?
         ORDER BY v.id DESC`,
        [id]
      );
      return res.json({ ...entrenamientos[0], videos });
    }

    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);
    const [accesos] = await db.query(
      "SELECT estado FROM entrenamiento_accesos WHERE entrenamiento_id = ? AND jugador_id = ?",
      [id, jugadorId]
    );
    const acceso = accesos[0]?.estado || "sin_solicitud";

    const { id: entId, fecha, creado_en } = entrenamientos[0];

    if (acceso !== "aprobado") {
      return res.json({ id: entId, fecha, creado_en, acceso, videos: [] });
    }

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.tipo, v.url_video, v.fecha_video
       FROM entrenamiento_videos ev
       JOIN videos v ON v.id = ev.video_id
       WHERE ev.entrenamiento_id = ?
       ORDER BY v.id DESC`,
      [id]
    );

    res.json({ id: entId, fecha, creado_en, acceso, videos });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el entrenamiento",
      error: error.message,
    });
  }
};

// El jugador pide acceso a una sesión puntual (upsert: si ya había pedido
// antes y fue rechazado, esto lo vuelve a poner en "pendiente").
const solicitarAcceso = async (req, res) => {
  try {
    const { id } = req.params;
    const jugadorId = await jugadorIdDeUsuario(req.usuario.id);
    if (!jugadorId) {
      return res.status(400).json({ message: "No se encontró tu ficha de jugador" });
    }

    const [entrenamientos] = await db.query(
      "SELECT id, fecha FROM entrenamientos WHERE id = ?",
      [id]
    );
    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    await db.query(
      `INSERT INTO entrenamiento_accesos (entrenamiento_id, jugador_id, estado, solicitado_en)
       VALUES (?, ?, 'pendiente', NOW())
       ON DUPLICATE KEY UPDATE estado = 'pendiente', solicitado_en = NOW(), resuelto_en = NULL, resuelto_por = NULL`,
      [id, jugadorId]
    );

    const [jugadores] = await db.query("SELECT nombre, apellido FROM jugadores WHERE id = ?", [jugadorId]);
    const nombreJugador = jugadores[0] ? `${jugadores[0].nombre} ${jugadores[0].apellido || ""}`.trim() : "Un jugador";
    const fechaTexto = new Date(entrenamientos[0].fecha).toISOString().slice(0, 10);

    await notificarCuerpoTecnico(
      "entrenamiento",
      `${nombreJugador} solicitó acceso al entrenamiento del ${fechaTexto}`,
      `/entrenamientos/${id}`
    );

    res.json({ message: "Solicitud enviada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al solicitar el acceso", error: error.message });
  }
};

// Listado de solicitudes de acceso a una sesión, para que el cuerpo técnico
// las apruebe o rechace.
const listarSolicitudes = async (req, res) => {
  try {
    const { id } = req.params;
    const [solicitudes] = await db.query(
      `SELECT ea.id, ea.jugador_id, j.nombre, j.apellido, ea.estado, ea.solicitado_en, ea.resuelto_en
       FROM entrenamiento_accesos ea
       JOIN jugadores j ON j.id = ea.jugador_id
       WHERE ea.entrenamiento_id = ?
       ORDER BY ea.estado = 'pendiente' DESC, ea.solicitado_en DESC`,
      [id]
    );
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ message: "Error al listar las solicitudes", error: error.message });
  }
};

// El cuerpo técnico aprueba o rechaza una solicitud puntual.
const resolverSolicitud = async (req, res) => {
  try {
    const { id, solicitudId } = req.params;
    const { estado } = req.body;

    if (!["aprobado", "rechazado"].includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const [solicitudes] = await db.query(
      "SELECT jugador_id FROM entrenamiento_accesos WHERE id = ? AND entrenamiento_id = ?",
      [solicitudId, id]
    );
    if (solicitudes.length === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    await db.query(
      "UPDATE entrenamiento_accesos SET estado = ?, resuelto_en = NOW(), resuelto_por = ? WHERE id = ?",
      [estado, req.usuario.id, solicitudId]
    );

    const [entrenamientos] = await db.query("SELECT fecha FROM entrenamientos WHERE id = ?", [id]);
    const fechaTexto = entrenamientos[0] ? new Date(entrenamientos[0].fecha).toISOString().slice(0, 10) : "";
    const mensaje =
      estado === "aprobado"
        ? `Se aprobó tu acceso al entrenamiento del ${fechaTexto}`
        : `Se rechazó tu solicitud de acceso al entrenamiento del ${fechaTexto}`;
    await notificarJugador(solicitudes[0].jugador_id, "entrenamiento", mensaje, `/entrenamientos/${id}`);

    res.json({ message: "Solicitud actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al resolver la solicitud", error: error.message });
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
      eliminarArchivo(videos[0].url_video);
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
        eliminarArchivo(video.url_video);
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

// Sirve el archivo de un video de entrenamiento. El cuerpo técnico siempre
// tiene acceso; el jugador solo si tiene el acceso aprobado a la sesión
// dueña de ese video (ver entrenamiento_accesos).
const obtenerArchivoVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const esCuerpoTecnico = CUERPO_TECNICO.includes(req.usuario.rol);

    const [videos] = await db.query(
      "SELECT tipo, url_video FROM videos WHERE id = ? AND categoria_video = 'entrenamiento'",
      [videoId]
    );

    if (videos.length === 0 || videos[0].tipo !== "archivo") {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    if (!esCuerpoTecnico) {
      const jugadorId = await jugadorIdDeUsuario(req.usuario.id);
      const [accesos] = await db.query(
        `SELECT ea.id FROM entrenamiento_videos ev
         JOIN entrenamiento_accesos ea ON ea.entrenamiento_id = ev.entrenamiento_id
         WHERE ev.video_id = ? AND ea.jugador_id = ? AND ea.estado = 'aprobado'`,
        [videoId, jugadorId]
      );
      if (accesos.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a este video" });
      }
    }

    await servirArchivo(req, res, videos[0].url_video);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

// Página de reflexión post-entrenamiento: una sola por sesión (no una lista
// como los ejercicios). Material exclusivo del cuerpo técnico.
const obtenerReflexion = async (req, res) => {
  try {
    const { id } = req.params;

    const [entrenamientos] = await db.query(
      `SELECT id, fecha, reflexion_dia, reflexion_sesion_numero, reflexion_turno,
              reflexion_objetivo, reflexion_logro_objetivo, reflexion_respuesta_jugadores,
              reflexion_intervencion_ct, reflexion_modificaciones, reflexion_entrenador_cargo, reflexion_firma
       FROM entrenamientos WHERE id = ?`,
      [id]
    );

    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    res.json(entrenamientos[0]);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la reflexión",
      error: error.message,
    });
  }
};

const actualizarReflexion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reflexion_dia,
      reflexion_sesion_numero,
      reflexion_turno,
      reflexion_objetivo,
      reflexion_logro_objetivo,
      reflexion_respuesta_jugadores,
      reflexion_intervencion_ct,
      reflexion_modificaciones,
      reflexion_entrenador_cargo,
      reflexion_firma,
    } = req.body;

    const [result] = await db.query(
      `UPDATE entrenamientos SET
         reflexion_dia = ?, reflexion_sesion_numero = ?, reflexion_turno = ?,
         reflexion_objetivo = ?, reflexion_logro_objetivo = ?, reflexion_respuesta_jugadores = ?,
         reflexion_intervencion_ct = ?, reflexion_modificaciones = ?,
         reflexion_entrenador_cargo = ?, reflexion_firma = ?
       WHERE id = ?`,
      [
        reflexion_dia || null,
        reflexion_sesion_numero || null,
        reflexion_turno || null,
        reflexion_objetivo || null,
        reflexion_logro_objetivo || null,
        reflexion_respuesta_jugadores || null,
        reflexion_intervencion_ct || null,
        reflexion_modificaciones || null,
        reflexion_entrenador_cargo || null,
        reflexion_firma || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    res.json({ message: "Reflexión guardada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar la reflexión",
      error: error.message,
    });
  }
};

module.exports = {
  crearEntrenamiento,
  actualizarEntrenamiento,
  listarEntrenamientos,
  obtenerEntrenamiento,
  eliminarVideoEntrenamiento,
  eliminarEntrenamiento,
  obtenerArchivoVideo,
  obtenerReflexion,
  actualizarReflexion,
  solicitarAcceso,
  listarSolicitudes,
  resolverSolicitud,
};
