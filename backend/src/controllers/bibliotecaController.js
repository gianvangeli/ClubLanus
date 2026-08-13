const db = require("../config/db");
const { guardarArchivo, guardarArchivoDesdeRuta, servirArchivo, eliminarArchivo } = require("../config/storage");
const { crearNotificacion, notificarTodosLosJugadores } = require("../config/notificaciones");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

const TIPOS_PUBLICACION = ["analisis", "partido"];
const TIPOS_ANALISIS = ["propio", "rival"];

const crearPublicacion = async (req, res) => {
  try {
    const { titulo, descripcion, estado, visible_desde, tipo, analisis_tipo } = req.body;
    const creadoPor = req.usuario.id;

    if (!titulo) {
      return res.status(400).json({ message: "El título es obligatorio" });
    }

    if (!tipo || !TIPOS_PUBLICACION.includes(tipo)) {
      return res.status(400).json({ message: "El tipo de publicación debe ser 'analisis' o 'partido'" });
    }

    if (analisis_tipo && (tipo !== "analisis" || !TIPOS_ANALISIS.includes(analisis_tipo))) {
      return res.status(400).json({ message: "analisis_tipo debe ser 'propio' o 'rival', y solo aplica a publicaciones de tipo 'analisis'" });
    }

    const estadoFinal = estado || "publicado";

    const [result] = await db.query(
      `
      INSERT INTO biblioteca
      (titulo, descripcion, tipo, analisis_tipo, estado, visible_desde, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        titulo,
        descripcion || null,
        tipo,
        tipo === "analisis" ? analisis_tipo || null : null,
        estadoFinal,
        visible_desde || null,
        creadoPor,
      ]
    );

    // Un "partido" es visible para todo el plantel automáticamente (sin
    // asignación): apenas se publica, se avisa a todos los jugadores.
    if (tipo === "partido" && estadoFinal === "publicado") {
      await notificarTodosLosJugadores("biblioteca", `Se subió un nuevo partido: "${titulo}"`, `/biblioteca/${result.insertId}`);
    }

    res.status(201).json({
      message: "Publicación creada correctamente",
      biblioteca_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear publicación",
      error: error.message,
    });
  }
};

// Edita datos de una publicación ya creada: título, descripción, estado,
// el tipo de análisis (propio/rival) y su plan de partido. El "tipo"
// (análisis/partido) no se puede cambiar una vez creada la publicación.
const actualizarPublicacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, estado, analisis_tipo, plan_partido_json } = req.body;

    const [publicaciones] = await db.query("SELECT id, tipo, analisis_pdf_url FROM biblioteca WHERE id = ?", [id]);
    if (publicaciones.length === 0) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    if (analisis_tipo !== undefined && analisis_tipo !== null) {
      if (publicaciones[0].tipo !== "analisis" || !TIPOS_ANALISIS.includes(analisis_tipo)) {
        return res.status(400).json({ message: "analisis_tipo debe ser 'propio' o 'rival', y solo aplica a publicaciones de tipo 'analisis'" });
      }
    }

    // Guardar el plan armado en la app es mutuamente excluyente con el PDF
    // subido (ver subirAnalisisPdf): si había un PDF, se descarta.
    const guardaPlanArmado = plan_partido_json !== undefined;
    if (guardaPlanArmado && publicaciones[0].analisis_pdf_url) {
      eliminarArchivo(publicaciones[0].analisis_pdf_url);
    }

    await db.query(
      `UPDATE biblioteca SET
         titulo = COALESCE(?, titulo),
         descripcion = COALESCE(?, descripcion),
         estado = COALESCE(?, estado),
         analisis_tipo = COALESCE(?, analisis_tipo),
         plan_partido_json = COALESCE(?, plan_partido_json),
         analisis_modo = CASE WHEN ? THEN 'armado' ELSE analisis_modo END,
         analisis_pdf_url = CASE WHEN ? THEN NULL ELSE analisis_pdf_url END,
         analisis_pdf_nombre_original = CASE WHEN ? THEN NULL ELSE analisis_pdf_nombre_original END
       WHERE id = ?`,
      [
        titulo || null,
        descripcion || null,
        estado || null,
        analisis_tipo || null,
        plan_partido_json !== undefined ? JSON.stringify(plan_partido_json) : null,
        guardaPlanArmado,
        guardaPlanArmado,
        guardaPlanArmado,
        id,
      ]
    );

    res.json({ message: "Publicación actualizada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar publicación",
      error: error.message,
    });
  }
};

const listarBibliotecaJugador = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Un "partido" es visible para todo el plantel sin asignación previa;
    // un "análisis" solo si está asignado vía biblioteca_usuarios.
    const [items] = await db.query(
      `
      SELECT
        b.id,
        b.titulo,
        b.descripcion,
        b.tipo,
        b.analisis_tipo,
        b.fecha_publicacion,
        b.estado
      FROM biblioteca b
      LEFT JOIN biblioteca_usuarios bu
        ON b.id = bu.biblioteca_id AND bu.usuario_id = ?
      WHERE b.estado = 'publicado'
        AND (b.tipo = 'partido' OR bu.usuario_id IS NOT NULL)
      ORDER BY b.fecha_publicacion DESC
      `,
      [usuarioId]
    );

    res.json(items);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar biblioteca",
      error: error.message,
    });
  }
};

// Agrega un video a una publicación. Admite dos formas de cargarlo:
// - Archivo subido (multipart/form-data, campo "video") -> tipo = "archivo"
// - Link externo (url_video en el body) -> tipo = "link"
const agregarVideoABiblioteca = async (req, res) => {
  try {
    const bibliotecaId = req.params.id;
    const creadoPor = req.usuario.id;

    const { titulo, descripcion, url_video } = req.body;

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
       VALUES (?, ?, ?, ?, 'biblioteca', ?)`,
      [titulo, descripcion || null, tipo, urlFinal, creadoPor]
    );

    const videoId = videoResult.insertId;

    await db.query(
      `
      INSERT INTO biblioteca_videos
      (biblioteca_id, video_id)
      VALUES (?, ?)
      `,
      [bibliotecaId, videoId]
    );

    res.status(201).json({
      message: "Video agregado a la publicación correctamente",
      video_id: videoId,
      biblioteca_id: Number(bibliotecaId),
      tipo,
      url_video: urlFinal,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al agregar video a la publicación",
      error: error.message,
    });
  }
};

const asignarUsuariosABiblioteca = async (req, res) => {
  try {
    const bibliotecaId = req.params.id;
    const { usuarios } = req.body;

    if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({
        message: "Tenés que enviar un array de usuarios",
      });
    }

    const [publicaciones] = await db.query("SELECT titulo, estado, tipo FROM biblioteca WHERE id = ?", [bibliotecaId]);
    if (publicaciones.length === 0) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }
    if (publicaciones[0].tipo === "partido") {
      return res.status(400).json({
        message: "Los partidos son visibles para todo el plantel, no hace falta asignarlos",
      });
    }

    for (const usuarioId of usuarios) {
      await db.query(
        `
        INSERT INTO biblioteca_usuarios
        (biblioteca_id, usuario_id)
        VALUES (?, ?)
        `,
        [bibliotecaId, usuarioId]
      );
    }

    if (publicaciones[0].estado === "publicado") {
      for (const usuarioId of usuarios) {
        await crearNotificacion(
          usuarioId,
          "biblioteca",
          `Se subió un nuevo video a tu biblioteca: "${publicaciones[0].titulo}"`,
          `/biblioteca/${bibliotecaId}`
        );
      }
    }

    res.status(201).json({
      message: "Usuarios asignados correctamente",
      biblioteca_id: Number(bibliotecaId),
      usuarios,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al asignar usuarios",
      error: error.message,
    });
  }
};

// El jugador abre una publicación: cuenta como una "apertura" más.
// Se llama una vez al iniciar la reproducción (no en cada heartbeat de progreso).
const abrirVisualizacion = async (req, res) => {
  try {
    const bibliotecaId = req.params.id;
    const usuarioId = req.usuario.id;

    const [existentes] = await db.query(
      "SELECT id FROM biblioteca_visualizaciones WHERE biblioteca_id = ? AND usuario_id = ?",
      [bibliotecaId, usuarioId]
    );

    if (existentes.length === 0) {
      await db.query(
        `INSERT INTO biblioteca_visualizaciones
         (biblioteca_id, usuario_id, veces_abierto, ultima_visualizacion)
         VALUES (?, ?, 1, NOW())`,
        [bibliotecaId, usuarioId]
      );
    } else {
      await db.query(
        `UPDATE biblioteca_visualizaciones
         SET veces_abierto = veces_abierto + 1,
             ultima_visualizacion = NOW()
         WHERE biblioteca_id = ? AND usuario_id = ?`,
        [bibliotecaId, usuarioId]
      );
    }

    res.json({ message: "Apertura registrada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar la apertura",
      error: error.message,
    });
  }
};

// El jugador reporta su avance (segundo actual del video y si lo terminó).
// Se llama periódicamente mientras reproduce; no incrementa veces_abierto.
const actualizarProgreso = async (req, res) => {
  try {
    const bibliotecaId = req.params.id;
    const usuarioId = req.usuario.id;
    const { segundo_actual, completo } = req.body;

    if (segundo_actual === undefined) {
      return res.status(400).json({ message: "Falta segundo_actual" });
    }

    const [existentes] = await db.query(
      "SELECT id FROM biblioteca_visualizaciones WHERE biblioteca_id = ? AND usuario_id = ?",
      [bibliotecaId, usuarioId]
    );

    if (existentes.length === 0) {
      await db.query(
        `INSERT INTO biblioteca_visualizaciones
         (biblioteca_id, usuario_id, veces_abierto, ultimo_segundo_video, visto_completo, ultima_visualizacion)
         VALUES (?, ?, 1, ?, ?, NOW())`,
        [bibliotecaId, usuarioId, segundo_actual, completo ? 1 : 0]
      );
    } else {
      await db.query(
        `UPDATE biblioteca_visualizaciones
         SET ultimo_segundo_video = ?,
             visto_completo = ?,
             ultima_visualizacion = NOW()
         WHERE biblioteca_id = ? AND usuario_id = ?`,
        [segundo_actual, completo ? 1 : 0, bibliotecaId, usuarioId]
      );
    }

    res.json({ message: "Progreso actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el progreso",
      error: error.message,
    });
  }
};

// Reporte para el cuerpo técnico: Jugador | Estado | Veces visto | Última vez
const obtenerReporteVisualizaciones = async (req, res) => {
  try {
    const bibliotecaId = req.params.id;

    const [videoRef] = await db.query(
      `SELECT v.duracion_segundos
       FROM biblioteca_videos bv
       JOIN videos v ON v.id = bv.video_id
       WHERE bv.biblioteca_id = ?
       ORDER BY bv.id ASC
       LIMIT 1`,
      [bibliotecaId]
    );
    const duracion = videoRef[0]?.duracion_segundos || null;

    const [filas] = await db.query(
      `SELECT
         u.id AS usuario_id,
         u.nombre AS jugador,
         bv.veces_abierto,
         bv.ultimo_segundo_video,
         bv.visto_completo,
         bv.ultima_visualizacion
       FROM biblioteca_usuarios bu
       JOIN usuarios u ON u.id = bu.usuario_id
       LEFT JOIN biblioteca_visualizaciones bv
         ON bv.biblioteca_id = bu.biblioteca_id AND bv.usuario_id = bu.usuario_id
       WHERE bu.biblioteca_id = ?
       ORDER BY u.nombre`,
      [bibliotecaId]
    );

    const reporte = filas.map((fila) => {
      let estado = "❌ No visto";
      const vecesVisto = fila.veces_abierto || 0;

      if (fila.visto_completo) {
        estado = "✅ Completo";
      } else if (fila.ultimo_segundo_video && duracion) {
        const porcentaje = Math.min(
          100,
          Math.round((fila.ultimo_segundo_video / duracion) * 100)
        );
        if (porcentaje > 0) estado = `🟡 ${porcentaje}%`;
      }

      return {
        jugador: fila.jugador,
        usuario_id: fila.usuario_id,
        estado,
        veces_visto: vecesVisto,
        ultima_vez: fila.ultima_visualizacion,
      };
    });

    res.json(reporte);
  } catch (error) {
    res.status(500).json({
      message: "Error al generar el reporte de visualizaciones",
      error: error.message,
    });
  }
};

// Sirve un video subido como archivo. Cuerpo técnico siempre puede.
// Un jugador solo si el video pertenece a una publicación publicada y
// asignada a él (misma regla que listarBibliotecaJugador).
const obtenerArchivoVideo = async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const usuario = req.usuario;

    const [videos] = await db.query(
      "SELECT id, tipo, url_video FROM videos WHERE id = ?",
      [videoId]
    );

    if (videos.length === 0) {
      return res.status(404).json({ message: "Video no encontrado" });
    }

    const video = videos[0];

    if (video.tipo !== "archivo") {
      return res.status(400).json({
        message: "Este video es un link externo, no un archivo subido",
      });
    }

    if (!CUERPO_TECNICO.includes(usuario.rol)) {
      const [acceso] = await db.query(
        `
        SELECT 1
        FROM biblioteca_videos bv
        JOIN biblioteca b ON b.id = bv.biblioteca_id
        LEFT JOIN biblioteca_usuarios bu ON bu.biblioteca_id = bv.biblioteca_id AND bu.usuario_id = ?
        WHERE bv.video_id = ?
          AND b.estado = 'publicado'
          AND (b.tipo = 'partido' OR bu.usuario_id IS NOT NULL)
        LIMIT 1
        `,
        [usuario.id, videoId]
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

// Sube el PDF de análisis armado por el analista de video, como alternativa
// a armar el plan cuadro por cuadro en la app (mutuamente excluyentes,
// mismo criterio que dietas_jugador: subir uno borra el otro).
const subirAnalisisPdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Subí el archivo PDF del análisis" });
    }

    const [publicaciones] = await db.query("SELECT analisis_pdf_url FROM biblioteca WHERE id = ?", [id]);
    if (publicaciones.length === 0) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    if (publicaciones[0].analisis_pdf_url) {
      eliminarArchivo(publicaciones[0].analisis_pdf_url);
    }

    const url = await guardarArchivo(req.file.buffer, "biblioteca-analisis", req.file.originalname);

    await db.query(
      `UPDATE biblioteca SET
         analisis_modo = 'archivo',
         analisis_pdf_url = ?,
         analisis_pdf_nombre_original = ?,
         plan_partido_json = NULL
       WHERE id = ?`,
      [url, req.file.originalname, id]
    );

    res.json({ message: "Análisis en PDF subido correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al subir el análisis en PDF",
      error: error.message,
    });
  }
};

// Sirve el PDF de análisis. Cuerpo técnico siempre; jugador solo si está
// asignado y la publicación está publicada (mismo criterio que verDetallePublicacion).
const obtenerArchivoAnalisisPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.usuario;

    const [publicaciones] = await db.query(
      "SELECT analisis_pdf_url, estado FROM biblioteca WHERE id = ?",
      [id]
    );
    if (publicaciones.length === 0 || !publicaciones[0].analisis_pdf_url) {
      return res.status(404).json({ message: "Esta publicación no tiene un análisis en PDF" });
    }

    if (!CUERPO_TECNICO.includes(usuario.rol)) {
      if (publicaciones[0].estado !== "publicado") {
        return res.status(403).json({ message: "No tenés acceso a este archivo" });
      }
      const [asignado] = await db.query(
        "SELECT 1 FROM biblioteca_usuarios WHERE biblioteca_id = ? AND usuario_id = ? LIMIT 1",
        [id, usuario.id]
      );
      if (asignado.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a este archivo" });
      }
    }

    await servirArchivo(req, res, publicaciones[0].analisis_pdf_url);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

// Listado completo de publicaciones para el cuerpo técnico (gestión)
const listarBibliotecaStaff = async (req, res) => {
  try {
    const [publicaciones] = await db.query(
      `SELECT
         b.id, b.titulo, b.descripcion, b.tipo, b.analisis_tipo, b.estado, b.fecha_publicacion, b.visible_desde,
         (SELECT COUNT(*) FROM biblioteca_videos bv WHERE bv.biblioteca_id = b.id) AS cantidad_videos,
         (SELECT COUNT(*) FROM biblioteca_usuarios bu WHERE bu.biblioteca_id = b.id) AS cantidad_jugadores
       FROM biblioteca b
       ORDER BY b.fecha_publicacion DESC`
    );
    res.json(publicaciones);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar publicaciones",
      error: error.message,
    });
  }
};

// Detalle de una publicación con sus videos.
// Cuerpo técnico: acceso total. Jugador: solo si está asignado y está publicada.
const verDetallePublicacion = async (req, res) => {
  try {
    const bibliotecaId = req.params.id;
    const usuario = req.usuario;
    const esStaff = CUERPO_TECNICO.includes(usuario.rol);

    const [publicaciones] = await db.query(
      "SELECT id, titulo, descripcion, tipo, analisis_tipo, plan_partido_json, analisis_modo, analisis_pdf_nombre_original, estado, fecha_publicacion, visible_desde, creado_por FROM biblioteca WHERE id = ?",
      [bibliotecaId]
    );

    if (publicaciones.length === 0) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    const publicacion = publicaciones[0];
    publicacion.plan_partido_json = publicacion.plan_partido_json ? JSON.parse(publicacion.plan_partido_json) : null;

    if (!esStaff) {
      if (publicacion.estado !== "publicado") {
        return res.status(403).json({ message: "No tenés acceso a esta publicación" });
      }

      // Un "partido" es visible para todo el plantel: no requiere asignación.
      if (publicacion.tipo !== "partido") {
        const [asignado] = await db.query(
          "SELECT 1 FROM biblioteca_usuarios WHERE biblioteca_id = ? AND usuario_id = ? LIMIT 1",
          [bibliotecaId, usuario.id]
        );

        if (asignado.length === 0) {
          return res.status(403).json({ message: "No tenés acceso a esta publicación" });
        }
      }
    }

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.descripcion, v.tipo, v.url_video
       FROM biblioteca_videos bv
       JOIN videos v ON v.id = bv.video_id
       WHERE bv.biblioteca_id = ?
       ORDER BY bv.id ASC`,
      [bibliotecaId]
    );

    let miProgreso = null;
    if (!esStaff) {
      const [progreso] = await db.query(
        "SELECT veces_abierto, ultimo_segundo_video, visto_completo, ultima_visualizacion FROM biblioteca_visualizaciones WHERE biblioteca_id = ? AND usuario_id = ?",
        [bibliotecaId, usuario.id]
      );
      miProgreso = progreso[0] || null;
    }

    let jugadoresAsignados = null;
    if (esStaff) {
      const [asignados] = await db.query(
        `SELECT u.id, u.nombre, u.email
         FROM biblioteca_usuarios bu
         JOIN usuarios u ON u.id = bu.usuario_id
         WHERE bu.biblioteca_id = ?
         ORDER BY u.nombre`,
        [bibliotecaId]
      );
      jugadoresAsignados = asignados;
    }

    res.json({
      ...publicacion,
      videos,
      mi_progreso: miProgreso,
      jugadores_asignados: jugadoresAsignados,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la publicación",
      error: error.message,
    });
  }
};

// Elimina una publicación completa: sus videos, las asignaciones a
// jugadores y el historial de visualizaciones. Borra el archivo de cada
// video si no lo usa nadie más (ficha de jugador o entrenamiento).
const eliminarPublicacion = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    const [publicaciones] = await conn.query("SELECT id, analisis_pdf_url FROM biblioteca WHERE id = ?", [id]);
    if (publicaciones.length === 0) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    const [videosDeLaPublicacion] = await conn.query(
      "SELECT video_id FROM biblioteca_videos WHERE biblioteca_id = ?",
      [id]
    );

    await conn.beginTransaction();

    await conn.query("DELETE FROM biblioteca_visualizaciones WHERE biblioteca_id = ?", [id]);
    await conn.query("DELETE FROM biblioteca_usuarios WHERE biblioteca_id = ?", [id]);
    await conn.query("DELETE FROM biblioteca_videos WHERE biblioteca_id = ?", [id]);

    const archivosABorrar = [];
    for (const { video_id } of videosDeLaPublicacion) {
      const [[{ total }]] = await conn.query(
        `SELECT
           (SELECT COUNT(*) FROM entrenamiento_videos WHERE video_id = ?) +
           (SELECT COUNT(*) FROM biblioteca_videos WHERE video_id = ?) AS total`,
        [video_id, video_id]
      );

      if (total === 0) {
        const [videoRows] = await conn.query("SELECT tipo, url_video FROM videos WHERE id = ?", [video_id]);
        if (videoRows[0]?.tipo === "archivo") {
          archivosABorrar.push(videoRows[0].url_video);
        }
        await conn.query("DELETE FROM videos WHERE id = ?", [video_id]);
      }
    }

    await conn.query("DELETE FROM biblioteca WHERE id = ?", [id]);

    await conn.commit();

    for (const urlVideo of archivosABorrar) {
      eliminarArchivo(urlVideo);
    }
    if (publicaciones[0].analisis_pdf_url) {
      eliminarArchivo(publicaciones[0].analisis_pdf_url);
    }

    res.json({ message: "Publicación eliminada correctamente" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      message: "Error al eliminar la publicación",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// Cuentas de jugadores registradas (para el selector de "asignar a")
const listarUsuariosJugadores = async (req, res) => {
  try {
    const [usuarios] = await db.query(
      "SELECT id, nombre, email FROM usuarios WHERE rol = 'jugador' ORDER BY nombre"
    );
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar jugadores registrados",
      error: error.message,
    });
  }
};

module.exports = {
    crearPublicacion,
    actualizarPublicacion,
    listarBibliotecaJugador,
    agregarVideoABiblioteca,
    asignarUsuariosABiblioteca,
    abrirVisualizacion,
    actualizarProgreso,
    obtenerReporteVisualizaciones,
    obtenerArchivoVideo,
    subirAnalisisPdf,
    obtenerArchivoAnalisisPdf,
    listarBibliotecaStaff,
    verDetallePublicacion,
    eliminarPublicacion,
    listarUsuariosJugadores,
};