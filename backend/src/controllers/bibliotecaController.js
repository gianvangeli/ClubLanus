const db = require("../config/db");
const {
  guardarArchivo,
  guardarArchivoDesdeRuta,
  servirArchivo,
  obtenerFlujoArchivo,
  eliminarArchivo,
} = require("../config/storage");
const { crearNotificacion, notificarTodosLosJugadores } = require("../config/notificaciones");
const { subirArchivoGeminiDesdeStream, generarDesdeVideo, generarJSONDesdeVideo } = require("../config/gemini");

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

const MIME_POR_EXTENSION = {
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  flv: "video/x-flv",
  webm: "video/webm",
  wmv: "video/x-ms-wmv",
  "3gp": "video/3gpp",
};

const REGEX_YOUTUBE = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i;

// Arma el prompt para el diagnóstico táctico. Mismo criterio que el resto
// de los prompts de IA de la app: texto plano sin markdown (consistente con
// diagnosticos_ia/analisis_futbolistico), en español, y con las métricas
// cuantitativas explícitamente marcadas como estimación de la IA (no son
// datos de tracking profesional como los del informe de Wyscout importado
// en "Estadísticas de partido").
const armarPromptDiagnosticoVideo = () =>
  [
    "Sos un analista táctico de fútbol del Club Atlético Lanús. Te paso un video de un partido o entrenamiento del club.",
    "Generá un diagnóstico táctico completo, organizado en las siguientes secciones (usá el nombre de cada sección como título, en mayúsculas, sin markdown, sin asteriscos ni numeración con símbolos):",
    "",
    "CONTEXTO: qué tipo de contenido es (partido oficial, amistoso, entrenamiento), qué equipos se enfrentan si se identifican, y en qué fase del juego se centra el análisis.",
    "FORTALEZAS: qué funcionó bien tácticamente para Lanús (estructura, circulación, presión, transiciones, definición).",
    "DEBILIDADES: qué se puede mejorar (errores posicionales, pérdidas de balón, desorganización defensiva, falta de profundidad, etc.).",
    "MOMENTOS CLAVE: jugadas puntuales relevantes (goles, ocasiones claras, errores graves), con el minuto aproximado si se puede estimar.",
    "SUGERENCIAS: recomendaciones tácticas concretas para el cuerpo técnico de cara a los próximos partidos.",
    "MÉTRICAS ESTIMADAS: un puñado de números aproximados (posesión %, cantidad de pases, duelos ganados/perdidos, remates) que puedas inferir mirando el video.",
    "",
    "Reglas estrictas:",
    "1. Las métricas de la sección MÉTRICAS ESTIMADAS son SIEMPRE una aproximación visual tuya, nunca datos de tracking profesional: aclaralo explícitamente en esa sección.",
    "2. Si el contenido del video no parece ser fútbol, o no corresponde a Lanús, decilo con claridad en la sección CONTEXTO en vez de inventar un análisis.",
    "3. Responder en español, en texto plano (sin markdown: nada de **, ##, guiones ni backticks), organizado por las secciones pedidas.",
  ].join("\n");

// Analiza con IA un video ya cargado en Biblioteca y genera un diagnóstico
// táctico (texto libre + métricas estimadas). No hay job en background: es
// una única request síncrona con un timeout largo (ver TIMEOUT_VIDEO_MS),
// mismo criterio que el resto de las importaciones con IA de la app, pero
// con más margen porque un partido completo tarda bastante más que un PDF.
const TIMEOUT_VIDEO_MS = 15 * 60 * 1000;

// Resuelve el video ya cargado a un { fileUri, mimeType, duracionSegundos }
// usable en generateContent: si es un link de YouTube, Gemini lo referencia
// directo (sin pasar por la Files API, así que no hay duración disponible);
// si es un archivo subido, hay que reenviarlo a la Files API de Gemini
// primero (ver subirArchivoGeminiDesdeStream), que sí informa la duración
// una vez procesado — se usa para poder analizar el partido en dos pasadas
// (primer/segundo tiempo, ver analizarEstadisticasEnDosTiempos).
// Devuelve null si el video no se puede analizar (link no soportado).
const resolverFileUriDeVideo = async (video) => {
  if (video.tipo === "link") {
    if (!REGEX_YOUTUBE.test(video.url_video)) return null;
    return { fileUri: video.url_video, mimeType: null, duracionSegundos: null };
  }

  const extension = video.url_video.split(".").pop().toLowerCase();
  const mimeType = MIME_POR_EXTENSION[extension] || "video/mp4";
  const { stream, sizeBytes } = await obtenerFlujoArchivo(video.url_video);
  const { fileUri, duracionSegundos } = await subirArchivoGeminiDesdeStream(stream, sizeBytes, mimeType);
  return { fileUri, mimeType, duracionSegundos };
};

const generarDiagnosticoVideoIA = async (req, res) => {
  try {
    const { videoId } = req.params;
    const generadoPor = req.usuario.id;

    const [videos] = await db.query("SELECT id, tipo, url_video FROM videos WHERE id = ?", [videoId]);
    if (videos.length === 0) {
      return res.status(404).json({ message: "Video no encontrado" });
    }
    const video = videos[0];

    const resuelto = await resolverFileUriDeVideo(video);
    if (!resuelto) {
      return res.status(400).json({
        message: "Por ahora solo se puede generar el diagnóstico para videos subidos como archivo o links de YouTube",
      });
    }
    const { fileUri, mimeType } = resuelto;

    const prompt = armarPromptDiagnosticoVideo();
    const contenido = await generarDesdeVideo(prompt, { fileUri, mimeType }, TIMEOUT_VIDEO_MS);

    const [resultado] = await db.query(
      "INSERT INTO video_analisis_ia (video_id, contenido, generado_por) VALUES (?, ?, ?)",
      [videoId, contenido, generadoPor]
    );

    res.status(201).json({ id: resultado.insertId, video_id: Number(videoId), contenido, creado_en: new Date() });
  } catch (error) {
    console.error("Error al generar diagnóstico de video con IA:", error);
    res.status(500).json({
      message: "Error al analizar el video con IA",
      error: error.message,
    });
  }
};

const listarDiagnosticosVideoIA = async (req, res) => {
  try {
    const { videoId } = req.params;
    const [diagnosticos] = await db.query(
      "SELECT id, contenido, creado_en FROM video_analisis_ia WHERE video_id = ? ORDER BY creado_en DESC, id DESC",
      [videoId]
    );
    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({ message: "Error al listar los diagnósticos", error: error.message });
  }
};

// Vocabulario de estadísticas de EQUIPO estimables desde video. Mucho más
// chico que el de "Estadísticas de partido" (PDF de Wyscout, ~50 métricas
// de un sistema de tracking real): acá se pide solo lo que la IA puede
// razonablemente estimar mirando un video a ojo — nada de xG, PPDA ni
// desgloses por jugador.
const CATEGORIAS_EQUIPO_VIDEO = [
  {
    categoria: "General",
    indicadores: ["Goles", "Tarjetas amarillas", "Tarjetas rojas", "Córneres", "Saques laterales"],
  },
  {
    categoria: "Tiros",
    indicadores: ["Tiros totales", "Tiros al arco"],
  },
  {
    categoria: "Pases",
    indicadores: [
      "Pases hacia adelante completos",
      "Pases hacia adelante incompletos",
      "Pases hacia el costado completos",
      "Pases hacia el costado incompletos",
      "Centros",
    ],
  },
  { categoria: "Posesión", indicadores: ["Posesión del balón (%)"] },
  { categoria: "Duelos", indicadores: ["Entradas (a ras de suelo)"] },
];

// Recibe el contexto del partido que el cuerpo técnico ya tipeó a mano
// (rival, resultado, competencia) para que la IA no tenga que adivinarlo
// mirando el video a ciegas. Sin esto, la IA no solo estimaba mal las
// métricas: identificaba mal cuántos goles hubo y de quién, porque no
// tenía ningún dato confirmado contra el cual chequear lo que iba viendo
// en un partido completo de ~90 minutos.
const armarPromptEstadisticasVideo = ({ rival, resultado, competencia, condicion } = {}) => {
  const vocabulario = CATEGORIAS_EQUIPO_VIDEO.map(
    ({ categoria, indicadores }) => `- ${categoria}: ${indicadores.join(", ")}`
  ).join("\n");

  const datosConfirmados = [
    rival ? `Rival: ${rival}` : null,
    resultado ? `Resultado final confirmado: ${resultado} (Lanús - rival)` : null,
    competencia ? `Competencia: ${competencia}` : null,
    condicion ? `Lanús jugó de ${condicion}` : null,
  ].filter(Boolean);

  return [
    "Sos un analista táctico de fútbol del Club Atlético Lanús. Te paso un video de un partido del club.",
    datosConfirmados.length > 0
      ? [
          "Estos datos del partido ya están confirmados por el cuerpo técnico, son un HECHO, no los reinterpretes ni los contradigas:",
          ...datosConfirmados.map((d) => `- ${d}`),
          resultado
            ? "Usá el resultado confirmado como ancla: recorré el video buscando específicamente las jugadas de gol que expliquen ese marcador exacto (cuántos goles hizo cada equipo y en qué momento aproximado), en vez de estimar un resultado propio."
            : null,
        ].filter(Boolean).join("\n")
      : null,
    "Mirá el video completo (no solo el inicio) y estimá, para cada uno de los dos equipos (Lanús y el rival), los siguientes indicadores:",
    vocabulario,
    "",
    "Reglas estrictas:",
    "1. Respondé SOLO JSON válido, sin texto adicional ni fences de markdown, con este schema exacto:",
    '   { "equipo": [ { "categoria": string, "indicador": string, "valor_lanus": number|null, "valor_rival": number|null } ] }',
    "2. Usá exactamente las categorías e indicadores de la lista de arriba, uno por fila. Si no podés estimar un valor para alguno de los dos equipos, usá null en ese lado (no inventes).",
    "3. Determiná cuál de los dos equipos del video es el Club Atlético Lanús (indumentaria granate) — ese va en valor_lanus, el otro en valor_rival.",
    "4. Estos valores son SIEMPRE una estimación visual aproximada, no datos de tracking profesional: hacé tu mejor estimación igual, no dejes todo en null salvo que el video no permita ver nada del partido.",
    "5. Números con punto decimal.",
  ].filter(Boolean).join("\n");
};

// El resultado final (ej. "3-1") lo tipea el cuerpo técnico a mano, no la
// IA: es un dato real y confiable, a diferencia del indicador "Goles" que
// la IA infiere mirando el video (mucho menos preciso para un evento
// puntual — un gol puede pasar en un segundo y quedar fuera del muestreo
// de frames). Se usa para pisar ese indicador con el marcador real en vez
// de confiar en la estimación visual. Asume que el resultado siempre se
// tipea en orden "Lanús - Rival" (mismo criterio que el placeholder del
// formulario, "Ej: 2-0"), sin importar si Lanús jugó de local o visitante.
const parsearGolesDeResultado = (resultado) => {
  if (!resultado) return null;
  const match = String(resultado).match(/(\d+)\D+(\d+)/);
  if (!match) return null;
  return { lanus: Number(match[1]), rival: Number(match[2]) };
};

// Valida y limpia la respuesta cruda de la IA a la forma que se guarda en
// estadisticas_partido. Devuelve null si no vino en el formato esperado.
const normalizarEquipoIA = (resultadoIA) => {
  if (!resultadoIA || !Array.isArray(resultadoIA.equipo)) return null;
  return resultadoIA.equipo
    .filter((i) => i && i.indicador && (typeof i.valor_lanus === "number" || typeof i.valor_rival === "number"))
    .map((i) => ({
      categoria: i.categoria || "Otros",
      indicador: String(i.indicador),
      valor_lanus: typeof i.valor_lanus === "number" && !Number.isNaN(i.valor_lanus) ? i.valor_lanus : null,
      valor_rival: typeof i.valor_rival === "number" && !Number.isNaN(i.valor_rival) ? i.valor_rival : null,
    }));
};

// Combina el valor de un mismo indicador leído en las dos pasadas (primer y
// segundo tiempo). La posesión es un porcentaje del partido completo: se
// promedia. El resto son conteos de cada mitad: se suman.
const combinarValorIndicador = (indicador, a, b) => {
  if (a == null) return b;
  if (b == null) return a;
  return indicador === "Posesión del balón (%)" ? Math.round(((a + b) / 2) * 10) / 10 : a + b;
};

const combinarEquiposDeAmbosTiempos = (equipoPrimerTiempo, equipoSegundoTiempo) => {
  const porClave = new Map();
  for (const fila of [...equipoPrimerTiempo, ...equipoSegundoTiempo]) {
    const clave = `${fila.categoria}|${fila.indicador}`;
    const existente = porClave.get(clave);
    if (!existente) {
      porClave.set(clave, { ...fila });
      continue;
    }
    existente.valor_lanus = combinarValorIndicador(fila.indicador, existente.valor_lanus, fila.valor_lanus);
    existente.valor_rival = combinarValorIndicador(fila.indicador, existente.valor_rival, fila.valor_rival);
  }
  return Array.from(porClave.values());
};

// Analiza el video en dos pasadas (primer y segundo tiempo) en vez de una
// sola sobre el partido entero: mirar ~90 minutos de una sola vez hace que
// a la IA se le escapen eventos puntuales como goles (bug real detectado:
// contó 1-0 un partido que terminó 3-1). Cada pasada usa video_metadata
// para acotar el análisis a esa mitad del MISMO archivo ya subido — no se
// vuelve a subir el video, solo se le indica a Gemini qué tramo mirar.
// Si el parámetro video_metadata falla (hay reportes de error 500 de la
// propia API de Google con este parámetro en algunos casos), se lanza el
// error y el llamador cae de nuevo al análisis de partido completo.
const analizarEstadisticasEnDosTiempos = async (prompt, video, duracionSegundos, timeoutMs) => {
  const mitad = duracionSegundos / 2;
  const minutoMitad = Math.round(mitad / 60);

  const [resultado1, resultado2] = await Promise.all([
    generarJSONDesdeVideo(
      `${prompt}\n\nIMPORTANTE: el tramo de video que te llega ahora es SOLO el primer tiempo del partido (del minuto 0 al ${minutoMitad} aproximadamente). Analizá únicamente lo que ves en este tramo, no asumas nada de lo que pasa después.`,
      video,
      timeoutMs,
      { startOffset: 0, endOffset: mitad }
    ),
    generarJSONDesdeVideo(
      `${prompt}\n\nIMPORTANTE: el tramo de video que te llega ahora es SOLO el segundo tiempo del partido (del minuto ${minutoMitad} en adelante, aproximadamente). Analizá únicamente lo que ves en este tramo, no asumas nada de lo que pasa antes.`,
      video,
      timeoutMs,
      { startOffset: mitad, endOffset: duracionSegundos }
    ),
  ]);

  const equipo1 = normalizarEquipoIA(resultado1);
  const equipo2 = normalizarEquipoIA(resultado2);
  if (!equipo1 || !equipo2) {
    throw new Error("La IA no devolvió el formato esperado en el análisis por tiempos");
  }

  return combinarEquiposDeAmbosTiempos(equipo1, equipo2);
};

// Por debajo de este umbral, analizar el video en dos pasadas no aporta
// (poco contenido por tramo) y solo duplica el costo/tiempo de la llamada.
const UMBRAL_DOS_TIEMPOS_SEGUNDOS = 20 * 60;

// Analiza con IA un video ya cargado en Biblioteca y genera estadísticas de
// EQUIPO estimadas (sin desglose por jugador: identificar qué jugador hizo
// qué acción desde video no es confiable). Se guarda directo en
// estadisticas_partido con origen='video' (sin preview editable previo,
// a diferencia del import por PDF: son pocas métricas y ya vienen
// marcadas como estimación — si están mal, alcanza con borrar el partido).
const generarEstadisticasVideoIA = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { fecha, rival, condicion, resultado, competencia } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !rival) {
      return res.status(400).json({ message: "Fecha y rival son obligatorios" });
    }
    if (condicion && !["local", "visitante"].includes(condicion)) {
      return res.status(400).json({ message: "Condición inválida" });
    }

    const [videos] = await db.query("SELECT id, tipo, url_video FROM videos WHERE id = ?", [videoId]);
    if (videos.length === 0) {
      return res.status(404).json({ message: "Video no encontrado" });
    }
    const video = videos[0];

    const resuelto = await resolverFileUriDeVideo(video);
    if (!resuelto) {
      return res.status(400).json({
        message: "Por ahora solo se pueden generar estadísticas para videos subidos como archivo o links de YouTube",
      });
    }
    const { fileUri, mimeType, duracionSegundos } = resuelto;

    const prompt = armarPromptEstadisticasVideo({ rival, resultado, competencia, condicion });

    let equipo = null;
    if (duracionSegundos && duracionSegundos > UMBRAL_DOS_TIEMPOS_SEGUNDOS) {
      try {
        equipo = await analizarEstadisticasEnDosTiempos(prompt, { fileUri, mimeType }, duracionSegundos, TIMEOUT_VIDEO_MS);
      } catch (err) {
        console.error("Falló el análisis por tiempos, se reintenta con el partido completo en una sola pasada:", err.message);
      }
    }

    if (!equipo) {
      const resultadoIA = await generarJSONDesdeVideo(prompt, { fileUri, mimeType }, TIMEOUT_VIDEO_MS);
      equipo = normalizarEquipoIA(resultadoIA);
      if (!equipo) {
        return res.status(502).json({ message: "La IA no devolvió el formato esperado. Probá de nuevo." });
      }
    }

    if (equipo.length === 0) {
      return res.status(502).json({ message: "La IA no pudo estimar ninguna estadística de este video" });
    }

    const golesReales = parsearGolesDeResultado(resultado);
    if (golesReales) {
      const filaGoles = { categoria: "General", indicador: "Goles", valor_lanus: golesReales.lanus, valor_rival: golesReales.rival };
      const indiceGoles = equipo.findIndex((i) => i.categoria === "General" && i.indicador === "Goles");
      if (indiceGoles >= 0) {
        equipo[indiceGoles] = filaGoles;
      } else {
        equipo.unshift(filaGoles);
      }
    }

    const [resultadoInsert] = await db.query(
      `INSERT INTO estadisticas_partido (fecha, rival, condicion, resultado, competencia, origen, equipo_indicadores, registrado_por)
       VALUES (?, ?, ?, ?, ?, 'video', ?, ?)`,
      [fecha, rival, condicion || null, resultado || null, competencia || null, JSON.stringify(equipo), registradoPor]
    );

    res.status(201).json({ partido_id: resultadoInsert.insertId });
  } catch (error) {
    console.error("Error al generar estadísticas de video con IA:", error);
    res.status(500).json({
      message: "Error al analizar el video con IA",
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
    generarDiagnosticoVideoIA,
    listarDiagnosticosVideoIA,
    generarEstadisticasVideoIA,
    subirAnalisisPdf,
    obtenerArchivoAnalisisPdf,
    listarBibliotecaStaff,
    verDetallePublicacion,
    eliminarPublicacion,
    listarUsuariosJugadores,
};