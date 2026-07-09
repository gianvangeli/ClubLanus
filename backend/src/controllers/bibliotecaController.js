const path = require("path");
const db = require("../config/db");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

const crearPublicacion = async (req, res) => {
  try {
    const { titulo, descripcion, estado, visible_desde } = req.body;
    const creadoPor = req.usuario.id;

    if (!titulo) {
      return res.status(400).json({ message: "El título es obligatorio" });
    }

    const [result] = await db.query(
      `
      INSERT INTO biblioteca 
      (titulo, descripcion, estado, visible_desde, creado_por)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        titulo,
        descripcion || null,
        estado || "publicado",
        visible_desde || null,
        creadoPor,
      ]
    );

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

const listarBibliotecaJugador = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const [items] = await db.query(
      `
      SELECT 
        b.id,
        b.titulo,
        b.descripcion,
        b.fecha_publicacion,
        b.estado
      FROM biblioteca b
      INNER JOIN biblioteca_usuarios bu
        ON b.id = bu.biblioteca_id
      WHERE bu.usuario_id = ?
        AND b.estado = 'publicado'
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

    const {
      titulo,
      descripcion,
      url_video,
      categoria_video,
      rival,
      resultado,
      duracion_segundos,
      fecha_video,
    } = req.body;

    let tipo;
    let urlFinal;

    if (req.file) {
      tipo = "archivo";
      urlFinal = `/uploads/videos/${req.file.filename}`;
    } else if (url_video) {
      tipo = "link";
      urlFinal = url_video;
    }

    if (!titulo || !categoria_video || !urlFinal) {
      return res.status(400).json({
        message:
          "Faltan datos obligatorios: título, categoría, y un archivo de video o un link",
      });
    }

    const [videoResult] = await db.query(
      `
      INSERT INTO videos
      (
        titulo,
        descripcion,
        tipo,
        url_video,
        categoria_video,
        rival,
        resultado,
        duracion_segundos,
        fecha_video,
        subido_por
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        titulo,
        descripcion || null,
        tipo,
        urlFinal,
        categoria_video,
        rival || null,
        resultado || null,
        duracion_segundos ? Number(duracion_segundos) : null,
        fecha_video || null,
        creadoPor,
      ]
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
        JOIN biblioteca_usuarios bu ON bu.biblioteca_id = bv.biblioteca_id
        JOIN biblioteca b ON b.id = bv.biblioteca_id
        WHERE bv.video_id = ?
          AND bu.usuario_id = ?
          AND b.estado = 'publicado'
        LIMIT 1
        `,
        [videoId, usuario.id]
      );

      if (acceso.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a este video" });
      }
    }

    const rutaArchivo = path.join(__dirname, "..", "..", video.url_video);
    res.sendFile(rutaArchivo, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: "Archivo de video no encontrado en el servidor" });
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el video",
      error: error.message,
    });
  }
};

// Listado completo de publicaciones para el cuerpo técnico (gestión)
const listarBibliotecaStaff = async (req, res) => {
  try {
    const [publicaciones] = await db.query(
      `SELECT
         b.id, b.titulo, b.descripcion, b.estado, b.fecha_publicacion, b.visible_desde,
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
      "SELECT id, titulo, descripcion, estado, fecha_publicacion, visible_desde, creado_por FROM biblioteca WHERE id = ?",
      [bibliotecaId]
    );

    if (publicaciones.length === 0) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    const publicacion = publicaciones[0];

    if (!esStaff) {
      if (publicacion.estado !== "publicado") {
        return res.status(403).json({ message: "No tenés acceso a esta publicación" });
      }

      const [asignado] = await db.query(
        "SELECT 1 FROM biblioteca_usuarios WHERE biblioteca_id = ? AND usuario_id = ? LIMIT 1",
        [bibliotecaId, usuario.id]
      );

      if (asignado.length === 0) {
        return res.status(403).json({ message: "No tenés acceso a esta publicación" });
      }
    }

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.descripcion, v.tipo, v.url_video, v.categoria_video, v.rival, v.resultado, v.duracion_segundos, v.fecha_video
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
    listarBibliotecaJugador,
    agregarVideoABiblioteca,
    asignarUsuariosABiblioteca,
    abrirVisualizacion,
    actualizarProgreso,
    obtenerReporteVisualizaciones,
    obtenerArchivoVideo,
    listarBibliotecaStaff,
    verDetallePublicacion,
    listarUsuariosJugadores,
};