const db = require("../config/db");
const { guardarArchivoDesdeRuta, servirArchivo, eliminarArchivo } = require("../config/storage");
const { tipoDeArchivoPizarra } = require("../middlewares/uploadPizarraMiddleware");

// Los ejercicios son material de planificación exclusivo del cuerpo técnico:
// el jugador nunca accede a estas rutas (ver entrenamientosRoutes/autorizarRoles).

const CAMPOS_EDITABLES = ["dia", "tipo_trabajo", "espacio", "objetivo", "n_jugadores", "duracion", "descripcion"];

const sinExtension = (nombreArchivo) => nombreArchivo.replace(/\.[^/.]+$/, "");

// Alta de un nuevo ejercicio en blanco para la sesión: se numera
// correlativamente ("Ejercicio 01", "02"...) según los que ya existan.
const crearEjercicio = async (req, res) => {
  try {
    const { entrenamientoId } = req.params;
    const creadoPor = req.usuario.id;

    const [entrenamientos] = await db.query("SELECT id, fecha FROM entrenamientos WHERE id = ?", [entrenamientoId]);
    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    const [[{ siguiente }]] = await db.query(
      "SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM ejercicios WHERE entrenamiento_id = ?",
      [entrenamientoId]
    );

    const [result] = await db.query(
      "INSERT INTO ejercicios (entrenamiento_id, numero, dia, creado_por) VALUES (?, ?, ?, ?)",
      [entrenamientoId, siguiente, entrenamientos[0].fecha, creadoPor]
    );

    res.status(201).json({
      message: "Ejercicio creado correctamente",
      ejercicio_id: result.insertId,
      numero: siguiente,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el ejercicio", error: error.message });
  }
};

// Listado de ejercicios de una sesión (para armar las "subpáginas")
const listarEjercicios = async (req, res) => {
  try {
    const { entrenamientoId } = req.params;
    const [ejercicios] = await db.query(
      `SELECT id, numero, tipo_trabajo, objetivo, creado_en
       FROM ejercicios WHERE entrenamiento_id = ? ORDER BY numero ASC`,
      [entrenamientoId]
    );
    res.json(ejercicios);
  } catch (error) {
    res.status(500).json({ message: "Error al listar los ejercicios", error: error.message });
  }
};

const obtenerEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const [ejercicios] = await db.query(
      `SELECT id, entrenamiento_id, numero, dia, tipo_trabajo, espacio, objetivo, n_jugadores, duracion,
              descripcion, dibujo_json, pizarra_modo, pizarra_archivo_tipo, pizarra_archivo_nombre_original,
              animacion_video_url, creado_por, creado_en
       FROM ejercicios WHERE id = ?`,
      [id]
    );
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    const ejercicio = ejercicios[0];
    ejercicio.dibujo_json = ejercicio.dibujo_json ? JSON.parse(ejercicio.dibujo_json) : null;

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.tipo, v.url_video
       FROM ejercicio_videos ev
       JOIN videos v ON v.id = ev.video_id
       WHERE ev.ejercicio_id = ?
       ORDER BY v.id DESC`,
      [id]
    );
    ejercicio.videos = videos;

    res.json(ejercicio);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el ejercicio", error: error.message });
  }
};

// Edita los campos de la planilla y la pizarra táctica: dibujada (escena
// completa en JSON) o, como alternativa mutuamente excluyente, subida como
// imagen/video ya armado.
const actualizarEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const dibujoJson = req.body.dibujo_json;

    const [ejercicios] = await db.query(
      "SELECT pizarra_archivo_url FROM ejercicios WHERE id = ?",
      [id]
    );
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    const asignaciones = CAMPOS_EDITABLES.map((campo) => `${campo} = ?`).join(", ");
    const valores = CAMPOS_EDITABLES.map((campo) => req.body[campo] || null);

    await db.query(`UPDATE ejercicios SET ${asignaciones} WHERE id = ?`, [...valores, id]);

    const archivoPizarra = (req.files?.pizarra_archivo || [])[0];

    // Dibujo y archivo son mutuamente excluyentes: al cambiar de modo se
    // borra lo que había del otro.
    if (archivoPizarra) {
      if (ejercicios[0].pizarra_archivo_url) eliminarArchivo(ejercicios[0].pizarra_archivo_url);
      const url = await guardarArchivoDesdeRuta(archivoPizarra.path, "pizarras", archivoPizarra.originalname);
      await db.query(
        `UPDATE ejercicios
         SET pizarra_modo = 'archivo', pizarra_archivo_url = ?, pizarra_archivo_tipo = ?,
             pizarra_archivo_nombre_original = ?, dibujo_json = NULL
         WHERE id = ?`,
        [url, tipoDeArchivoPizarra(archivoPizarra.mimetype), archivoPizarra.originalname, id]
      );
    } else if (dibujoJson !== undefined) {
      if (ejercicios[0].pizarra_archivo_url) eliminarArchivo(ejercicios[0].pizarra_archivo_url);
      await db.query(
        `UPDATE ejercicios
         SET pizarra_modo = 'dibujo', dibujo_json = ?, pizarra_archivo_url = NULL,
             pizarra_archivo_tipo = NULL, pizarra_archivo_nombre_original = NULL
         WHERE id = ?`,
        [typeof dibujoJson === "string" ? dibujoJson : JSON.stringify(dibujoJson), id]
      );
    }

    res.json({ message: "Ejercicio actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el ejercicio", error: error.message });
  }
};

const eliminarEjercicio = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query("SELECT pizarra_archivo_url FROM ejercicios WHERE id = ?", [id]);
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    await db.query("DELETE FROM ejercicios WHERE id = ?", [id]);

    if (ejercicios[0].pizarra_archivo_url) {
      eliminarArchivo(ejercicios[0].pizarra_archivo_url);
    }

    res.json({ message: "Ejercicio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el ejercicio", error: error.message });
  }
};

// Busca entre TODOS los ejercicios ya cargados (de cualquier sesión), para
// poder reutilizarlos en una sesión nueva sin tener que ir a buscar la
// sesión vieja en la agenda. Sin término de búsqueda, devuelve los últimos
// cargados (para poder navegar aunque no se sepa bien qué buscar).
const buscarEjercicios = async (req, res) => {
  try {
    const termino = `%${(req.query.q || "").trim()}%`;

    const [ejercicios] = await db.query(
      `SELECT e.id, e.numero, e.tipo_trabajo, e.espacio, e.objetivo, e.entrenamiento_id, en.fecha
       FROM ejercicios e
       JOIN entrenamientos en ON en.id = e.entrenamiento_id
       WHERE e.tipo_trabajo LIKE ? OR e.objetivo LIKE ? OR e.espacio LIKE ? OR e.descripcion LIKE ?
       ORDER BY en.fecha DESC, e.numero DESC
       LIMIT 30`,
      [termino, termino, termino, termino]
    );

    res.json(ejercicios);
  } catch (error) {
    res.status(500).json({ message: "Error al buscar ejercicios", error: error.message });
  }
};

// Copia un ejercicio ya cargado (planificación + dibujo táctico) como un
// ejercicio nuevo dentro de la sesión indicada, sin afectar al original.
const reutilizarEjercicio = async (req, res) => {
  try {
    const { entrenamientoId, origenId } = req.params;
    const creadoPor = req.usuario.id;

    const [entrenamientos] = await db.query("SELECT id, fecha FROM entrenamientos WHERE id = ?", [entrenamientoId]);
    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    const [origenes] = await db.query("SELECT * FROM ejercicios WHERE id = ?", [origenId]);
    if (origenes.length === 0) {
      return res.status(404).json({ message: "Ejercicio de origen no encontrado" });
    }
    const origen = origenes[0];

    const [[{ siguiente }]] = await db.query(
      "SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM ejercicios WHERE entrenamiento_id = ?",
      [entrenamientoId]
    );

    const [result] = await db.query(
      `INSERT INTO ejercicios
         (entrenamiento_id, numero, dia, tipo_trabajo, espacio, objetivo, n_jugadores, duracion, descripcion, dibujo_json, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entrenamientoId,
        siguiente,
        entrenamientos[0].fecha,
        origen.tipo_trabajo,
        origen.espacio,
        origen.objetivo,
        origen.n_jugadores,
        origen.duracion,
        origen.descripcion,
        origen.dibujo_json,
        creadoPor,
      ]
    );

    res.status(201).json({
      message: "Ejercicio reutilizado correctamente",
      ejercicio_id: result.insertId,
      numero: siguiente,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al reutilizar el ejercicio", error: error.message });
  }
};

// Video real de la ejecución del ejercicio (archivo subido o link), para
// poder comparar al lado de la animación de la pizarra. Un ejercicio puede
// tener más de uno (por ejemplo, tomas desde distintos ángulos).
const agregarVideoEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo_video } = req.body;

    const [ejercicios] = await db.query("SELECT id FROM ejercicios WHERE id = ?", [id]);
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    const videosACrear = [];
    for (const archivo of req.files || []) {
      videosACrear.push({
        titulo: titulo_video || sinExtension(archivo.originalname),
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
        titulo: titulo_video || (urls.length > 1 ? `Video ${i + 1}` : url),
        tipo: "link",
        url_video: url,
      });
    });

    if (videosACrear.length === 0) {
      return res.status(400).json({ message: "Subí un archivo o pegá un link de video" });
    }

    for (const video of videosACrear) {
      const [videoResult] = await db.query(
        `INSERT INTO videos (titulo, tipo, url_video, categoria_video, subido_por) VALUES (?, ?, ?, 'ejercicio', ?)`,
        [video.titulo, video.tipo, video.url_video, req.usuario.id]
      );
      await db.query("INSERT INTO ejercicio_videos (ejercicio_id, video_id) VALUES (?, ?)", [id, videoResult.insertId]);
    }

    res.status(201).json({ message: "Video agregado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar el video", error: error.message });
  }
};

const eliminarVideoEjercicio = async (req, res) => {
  try {
    const { videoId } = req.params;

    const [videos] = await db.query("SELECT tipo, url_video FROM videos WHERE id = ?", [videoId]);
    if (videos.length === 0) {
      return res.status(404).json({ message: "Video no encontrado" });
    }

    await db.query("DELETE FROM ejercicio_videos WHERE video_id = ?", [videoId]);
    await db.query("DELETE FROM videos WHERE id = ?", [videoId]);

    if (videos[0].tipo === "archivo") {
      eliminarArchivo(videos[0].url_video);
    }

    res.json({ message: "Video eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el video", error: error.message });
  }
};

const obtenerArchivoVideoEjercicio = async (req, res) => {
  try {
    const { videoId } = req.params;

    const [videos] = await db.query(
      "SELECT tipo, url_video FROM videos WHERE id = ? AND categoria_video = 'ejercicio'",
      [videoId]
    );

    if (videos.length === 0 || videos[0].tipo !== "archivo") {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, videos[0].url_video);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el archivo", error: error.message });
  }
};

// Guarda el video de animación generado por la pizarra táctica (grabado en
// el navegador a partir de la secuencia de escenas). Regenerar reemplaza al
// anterior en vez de acumular — mismo criterio que en ejercicios_tacticos.
const guardarAnimacionEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const archivo = req.file;
    if (!archivo) {
      return res.status(400).json({ message: "Falta el archivo de animación" });
    }

    const [ejercicios] = await db.query("SELECT animacion_video_url FROM ejercicios WHERE id = ?", [id]);
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    if (ejercicios[0].animacion_video_url) eliminarArchivo(ejercicios[0].animacion_video_url);

    const url = await guardarArchivoDesdeRuta(archivo.path, "ejercicios", archivo.originalname);
    await db.query("UPDATE ejercicios SET animacion_video_url = ? WHERE id = ?", [url, id]);

    res.status(201).json({ message: "Animación guardada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al guardar la animación", error: error.message });
  }
};

// Sirve el video de la animación generada.
const obtenerArchivoAnimacion = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query("SELECT animacion_video_url FROM ejercicios WHERE id = ?", [id]);
    if (ejercicios.length === 0 || !ejercicios[0].animacion_video_url) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, ejercicios[0].animacion_video_url);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el archivo", error: error.message });
  }
};

// Sirve la pizarra táctica cuando se cargó como imagen/video en vez de dibujada.
const obtenerArchivoPizarra = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query("SELECT pizarra_archivo_url FROM ejercicios WHERE id = ?", [id]);
    if (ejercicios.length === 0 || !ejercicios[0].pizarra_archivo_url) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, ejercicios[0].pizarra_archivo_url);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el archivo", error: error.message });
  }
};

module.exports = {
  crearEjercicio,
  listarEjercicios,
  obtenerEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
  buscarEjercicios,
  reutilizarEjercicio,
  agregarVideoEjercicio,
  eliminarVideoEjercicio,
  obtenerArchivoVideoEjercicio,
  obtenerArchivoPizarra,
  guardarAnimacionEjercicio,
  obtenerArchivoAnimacion,
};
