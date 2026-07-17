const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

const sinExtension = (nombreArchivo) => nombreArchivo.replace(/\.[^/.]+$/, "");

// El jugador solo debe ver título + fecha + video de cada sesión: los datos
// de planificación (tipo, objetivo, observaciones, materiales, espacios,
// dibujo táctico, cantidad de jugadores) quedan reservados al cuerpo técnico.
const paraJugador = (entrenamiento) => {
  const { id, fecha, titulo, cantidad_videos, creado_en } = entrenamiento;
  return { id, fecha, titulo, cantidad_videos, creado_en };
};

const extraerVideosDelBody = async (req, tituloVideo) => {
  const videosACrear = [];

  for (const archivo of req.files?.videos || []) {
    videosACrear.push({
      titulo: tituloVideo || sinExtension(archivo.originalname),
      tipo: "archivo",
      url_video: await guardarArchivo(archivo.buffer, "videos", archivo.originalname),
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
// agrega los videos subidos en la misma carga, junto con los datos de
// planificación. Pensado para un uso rápido: el cuerpo técnico elige la
// fecha (por defecto hoy) y sube 1 o 2 videos; después puede completar el
// resto desde la página propia de la sesión.
const crearEntrenamiento = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      fecha,
      titulo,
      descripcion,
      titulo_video,
      tipo_entrenamiento,
      duracion_minutos,
      objetivo,
      observaciones,
      cantidad_jugadores,
      materiales,
      espacios,
    } = req.body;
    const creadoPor = req.usuario.id;
    const fechaSesion = fecha || new Date().toISOString().slice(0, 10);
    const archivoDibujo = (req.files?.dibujo || [])[0];
    const dibujoUrl = archivoDibujo
      ? await guardarArchivo(archivoDibujo.buffer, "imagenes", archivoDibujo.originalname)
      : null;
    const videosACrear = await extraerVideosDelBody(req, titulo_video);

    await conn.beginTransaction();

    const [existentes] = await conn.query(
      "SELECT id, dibujo_url FROM entrenamientos WHERE fecha = ?",
      [fechaSesion]
    );

    let entrenamientoId;
    if (existentes.length > 0) {
      entrenamientoId = existentes[0].id;
      await conn.query(
        `UPDATE entrenamientos SET
           titulo = COALESCE(?, titulo),
           descripcion = COALESCE(?, descripcion),
           tipo_entrenamiento = COALESCE(?, tipo_entrenamiento),
           duracion_minutos = COALESCE(?, duracion_minutos),
           objetivo = COALESCE(?, objetivo),
           observaciones = COALESCE(?, observaciones),
           cantidad_jugadores = COALESCE(?, cantidad_jugadores),
           materiales = COALESCE(?, materiales),
           espacios = COALESCE(?, espacios),
           dibujo_url = COALESCE(?, dibujo_url)
         WHERE id = ?`,
        [
          titulo || null,
          descripcion || null,
          tipo_entrenamiento || null,
          duracion_minutos || null,
          objetivo || null,
          observaciones || null,
          cantidad_jugadores || null,
          materiales || null,
          espacios || null,
          dibujoUrl,
          entrenamientoId,
        ]
      );

      if (archivoDibujo && existentes[0].dibujo_url) {
        eliminarArchivo(existentes[0].dibujo_url);
      }
    } else {
      const [result] = await conn.query(
        `INSERT INTO entrenamientos
           (fecha, titulo, descripcion, tipo_entrenamiento, duracion_minutos, objetivo, observaciones,
            cantidad_jugadores, materiales, espacios, dibujo_url, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fechaSesion,
          titulo || null,
          descripcion || null,
          tipo_entrenamiento || null,
          duracion_minutos || null,
          objetivo || null,
          observaciones || null,
          cantidad_jugadores || null,
          materiales || null,
          espacios || null,
          dibujoUrl,
          creadoPor,
        ]
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

// Edita los datos de una sesión ya existente (título, descripción,
// planificación) y opcionalmente agrega más videos o reemplaza el dibujo.
// Es la página propia de cada entrenamiento: acá el cuerpo técnico completa
// o corrige lo que cargó rápido desde la agenda.
const actualizarEntrenamiento = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const {
      titulo,
      descripcion,
      titulo_video,
      tipo_entrenamiento,
      duracion_minutos,
      objetivo,
      observaciones,
      cantidad_jugadores,
      materiales,
      espacios,
    } = req.body;
    const creadoPor = req.usuario.id;
    const archivoDibujo = (req.files?.dibujo || [])[0];
    const dibujoUrl = archivoDibujo
      ? await guardarArchivo(archivoDibujo.buffer, "imagenes", archivoDibujo.originalname)
      : null;
    const videosACrear = await extraerVideosDelBody(req, titulo_video);

    const [existentes] = await conn.query("SELECT id, fecha, dibujo_url FROM entrenamientos WHERE id = ?", [id]);
    if (existentes.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE entrenamientos SET
         titulo = ?, descripcion = ?, tipo_entrenamiento = ?, duracion_minutos = ?,
         objetivo = ?, observaciones = ?, cantidad_jugadores = ?, materiales = ?,
         espacios = ?, dibujo_url = COALESCE(?, dibujo_url)
       WHERE id = ?`,
      [
        titulo || null,
        descripcion || null,
        tipo_entrenamiento || null,
        duracion_minutos || null,
        objetivo || null,
        observaciones || null,
        cantidad_jugadores || null,
        materiales || null,
        espacios || null,
        dibujoUrl,
        id,
      ]
    );

    if (archivoDibujo && existentes[0].dibujo_url) {
      eliminarArchivo(existentes[0].dibujo_url);
    }

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

// Agenda: una fila por día con sesión cargada, más reciente primero.
// El jugador solo recibe título + fecha + cantidad de videos; los datos de
// planificación quedan reservados al cuerpo técnico.
const listarEntrenamientos = async (req, res) => {
  try {
    const esCuerpoTecnico = CUERPO_TECNICO.includes(req.usuario.rol);

    const [entrenamientos] = await db.query(
      `SELECT e.id, e.fecha, e.titulo, e.descripcion, e.tipo_entrenamiento, e.duracion_minutos, e.objetivo,
              e.observaciones, e.cantidad_jugadores, e.materiales, e.espacios, e.dibujo_url, e.creado_en,
              (SELECT COUNT(*) FROM entrenamiento_videos ev WHERE ev.entrenamiento_id = e.id) AS cantidad_videos
       FROM entrenamientos e
       ORDER BY e.fecha DESC, e.id DESC`
    );

    res.json(esCuerpoTecnico ? entrenamientos : entrenamientos.map(paraJugador));
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los entrenamientos",
      error: error.message,
    });
  }
};

// Página propia de un entrenamiento. El cuerpo técnico ve todo (título,
// descripción, planificación y videos); el jugador solo título + fecha + videos.
const obtenerEntrenamiento = async (req, res) => {
  try {
    const { id } = req.params;
    const esCuerpoTecnico = CUERPO_TECNICO.includes(req.usuario.rol);

    const [entrenamientos] = await db.query(
      `SELECT id, fecha, titulo, descripcion, tipo_entrenamiento, duracion_minutos, objetivo,
              observaciones, cantidad_jugadores, materiales, espacios, dibujo_url, creado_en
       FROM entrenamientos WHERE id = ?`,
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

    const entrenamiento = { ...entrenamientos[0], videos };

    if (esCuerpoTecnico) {
      return res.json(entrenamiento);
    }

    const { id: entId, fecha, titulo, creado_en } = entrenamiento;
    res.json({ id: entId, fecha, titulo, creado_en, videos });
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

    const [entrenamientos] = await conn.query("SELECT id, dibujo_url FROM entrenamientos WHERE id = ?", [id]);
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
    if (entrenamientos[0].dibujo_url) {
      eliminarArchivo(entrenamientos[0].dibujo_url);
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

    await servirArchivo(req, res, videos[0].url_video);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

// Sirve la imagen del dibujo táctico de una sesión. Solo cuerpo técnico
// (es un dato de planificación, no debe llegar al jugador).
const obtenerArchivoDibujo = async (req, res) => {
  try {
    const { id } = req.params;

    const [entrenamientos] = await db.query(
      "SELECT dibujo_url FROM entrenamientos WHERE id = ?",
      [id]
    );

    if (entrenamientos.length === 0 || !entrenamientos[0].dibujo_url) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    }

    await servirArchivo(req, res, entrenamientos[0].dibujo_url);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la imagen",
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
      `SELECT id, fecha, titulo, reflexion_dia, reflexion_sesion_numero, reflexion_turno,
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
  obtenerArchivoDibujo,
  obtenerReflexion,
  actualizarReflexion,
};
