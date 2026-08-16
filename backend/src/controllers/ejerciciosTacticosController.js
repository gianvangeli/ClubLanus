const db = require("../config/db");
const { guardarArchivoDesdeRuta, servirArchivo, eliminarArchivo } = require("../config/storage");
const { tipoDeArchivoPizarra } = require("../middlewares/uploadPizarraMiddleware");

// Taxonomía fija de "Entrenamientos desglosados" (exclusivo del cuerpo
// técnico). "Rondos" quedó reducido a sus 4 subdivisiones por minutos; el
// resto de lo que antes eran subcategorías de rondos ahora son categorías
// propias de primer nivel, sin subdivisión (array vacío). Si en el futuro
// se agrega una categoría o sub-categoría nueva, alcanza con sumarla acá
// (no requiere migración, categoria/subcategoria son texto).
const SUBCATEGORIAS = {
  rondos: ["+5", "+10", "+15", "+20"],
  pelota_parada: [
    "ABP (en contra)",
    "Corner por derecha",
    "Corner por izquierda",
    "Tiro libre lateral",
    "Tiro libre semi-frontal",
    "Tiro libre frontal",
  ],
  preestablecido: [],
  ruta_de_pases: [],
  especifico_ofensivo: [],
  especifico_defensivo: [],
  posesiones: [],
  salidas_progresivas: [],
  ejercicios_individuales: [],
};

const CATEGORIAS = Object.keys(SUBCATEGORIAS);

// Si la categoría no tiene subdivisiones, la subcategoría debe venir vacía
// (no se exige que esté en una lista, porque no hay lista).
const validarCategoria = (categoria, subcategoria) => {
  if (!CATEGORIAS.includes(categoria)) return "Categoría inválida";
  const opciones = SUBCATEGORIAS[categoria];
  if (opciones.length > 0 && !opciones.includes(subcategoria)) return "Sub-categoría inválida";
  return null;
};

// Devuelve la taxonomía para que el frontend arme los botones de categoría/sub-categoría.
const listarCategorias = (req, res) => {
  res.json(SUBCATEGORIAS);
};

// Alta de un ejercicio táctico (video corto + pizarra) dentro de una
// categoría/sub-categoría fija. Se acumulan cronológicamente, no se
// sobrescriben entre sí.
const crearEjercicioTactico = async (req, res) => {
  try {
    const { categoria, titulo, fecha, descripcion, cantidad_jugadores, url_video, dibujo_json } = req.body;
    const creadoPor = req.usuario.id;
    const subcategoria = SUBCATEGORIAS[categoria]?.length > 0 ? req.body.subcategoria : null;

    const errorCategoria = validarCategoria(categoria, subcategoria);
    if (errorCategoria) {
      return res.status(400).json({ message: errorCategoria });
    }
    if (!titulo) {
      return res.status(400).json({ message: "El título es obligatorio" });
    }

    let videoTipo = null;
    let videoUrl = null;
    let videoNombre = null;

    const archivoVideo = (req.files?.video || [])[0];
    if (archivoVideo) {
      videoTipo = "archivo";
      videoUrl = await guardarArchivoDesdeRuta(archivoVideo.path, "ejercicios-tacticos", archivoVideo.originalname);
      videoNombre = archivoVideo.originalname;
    } else if (url_video && url_video.trim()) {
      videoTipo = "link";
      videoUrl = url_video.trim();
    }

    // Pizarra táctica: dibujada (dibujo_json) o subida como imagen/video ya
    // armado, mutuamente excluyentes.
    let dibujoGuardar = null;
    let pizarraModo = null;
    let pizarraArchivoUrl = null;
    let pizarraArchivoTipo = null;
    let pizarraArchivoNombre = null;

    const archivoPizarra = (req.files?.pizarra_archivo || [])[0];
    if (archivoPizarra) {
      pizarraModo = "archivo";
      pizarraArchivoUrl = await guardarArchivoDesdeRuta(archivoPizarra.path, "pizarras", archivoPizarra.originalname);
      pizarraArchivoTipo = tipoDeArchivoPizarra(archivoPizarra.mimetype);
      pizarraArchivoNombre = archivoPizarra.originalname;
    } else if (dibujo_json) {
      try {
        JSON.parse(dibujo_json);
        dibujoGuardar = dibujo_json;
        pizarraModo = "dibujo";
      } catch {
        return res.status(400).json({ message: "La pizarra táctica no tiene un formato válido" });
      }
    }

    const [result] = await db.query(
      `INSERT INTO ejercicios_tacticos
       (categoria, subcategoria, titulo, fecha, descripcion, cantidad_jugadores, video_tipo, video_url, video_nombre_original,
        dibujo_json, pizarra_modo, pizarra_archivo_url, pizarra_archivo_tipo, pizarra_archivo_nombre_original, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoria,
        subcategoria,
        titulo,
        fecha || null,
        descripcion || null,
        cantidad_jugadores || null,
        videoTipo,
        videoUrl,
        videoNombre,
        dibujoGuardar,
        pizarraModo,
        pizarraArchivoUrl,
        pizarraArchivoTipo,
        pizarraArchivoNombre,
        creadoPor,
      ]
    );

    res.status(201).json({ message: "Ejercicio táctico creado correctamente", id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el ejercicio táctico", error: error.message });
  }
};

// Listado de una categoría/sub-categoría puntual (exclusivo del cuerpo técnico).
const listarEjerciciosTacticos = async (req, res) => {
  try {
    const { categoria } = req.query;
    const subcategoria = req.query.subcategoria || null;

    const errorCategoria = validarCategoria(categoria, subcategoria);
    if (errorCategoria) {
      return res.status(400).json({ message: errorCategoria });
    }

    const [ejercicios] = await db.query(
      `SELECT id, titulo, fecha, cantidad_jugadores, creado_en
       FROM ejercicios_tacticos
       WHERE categoria = ? AND subcategoria <=> ?
       ORDER BY fecha DESC, id DESC`,
      [categoria, subcategoria]
    );

    res.json(ejercicios);
  } catch (error) {
    res.status(500).json({ message: "Error al listar los ejercicios tácticos", error: error.message });
  }
};

const obtenerEjercicioTactico = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query(
      `SELECT id, categoria, subcategoria, titulo, fecha, descripcion, cantidad_jugadores,
              video_tipo, video_url, video_nombre_original, dibujo_json,
              pizarra_modo, pizarra_archivo_tipo, pizarra_archivo_nombre_original, creado_por, creado_en
       FROM ejercicios_tacticos WHERE id = ?`,
      [id]
    );
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio táctico no encontrado" });
    }

    const ejercicio = ejercicios[0];
    ejercicio.dibujo_json = ejercicio.dibujo_json ? JSON.parse(ejercicio.dibujo_json) : null;

    res.json(ejercicio);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el ejercicio táctico", error: error.message });
  }
};

// Edita los datos y/o la pizarra táctica (dibujada o por archivo) de un
// ejercicio ya cargado.
const actualizarEjercicioTactico = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, fecha, descripcion, cantidad_jugadores, dibujo_json } = req.body;

    const [ejercicios] = await db.query(
      "SELECT pizarra_archivo_url FROM ejercicios_tacticos WHERE id = ?",
      [id]
    );
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio táctico no encontrado" });
    }

    await db.query(
      `UPDATE ejercicios_tacticos
       SET titulo = COALESCE(?, titulo), fecha = ?, descripcion = ?, cantidad_jugadores = ?
       WHERE id = ?`,
      [titulo || null, fecha || null, descripcion || null, cantidad_jugadores || null, id]
    );

    const archivoPizarra = (req.files?.pizarra_archivo || [])[0];

    // Dibujo y archivo son mutuamente excluyentes: al cambiar de modo se
    // borra lo que había del otro.
    if (archivoPizarra) {
      if (ejercicios[0].pizarra_archivo_url) eliminarArchivo(ejercicios[0].pizarra_archivo_url);
      const url = await guardarArchivoDesdeRuta(archivoPizarra.path, "pizarras", archivoPizarra.originalname);
      await db.query(
        `UPDATE ejercicios_tacticos
         SET pizarra_modo = 'archivo', pizarra_archivo_url = ?, pizarra_archivo_tipo = ?,
             pizarra_archivo_nombre_original = ?, dibujo_json = NULL
         WHERE id = ?`,
        [url, tipoDeArchivoPizarra(archivoPizarra.mimetype), archivoPizarra.originalname, id]
      );
    } else if (dibujo_json !== undefined) {
      if (ejercicios[0].pizarra_archivo_url) eliminarArchivo(ejercicios[0].pizarra_archivo_url);
      await db.query(
        `UPDATE ejercicios_tacticos
         SET pizarra_modo = 'dibujo', dibujo_json = ?, pizarra_archivo_url = NULL,
             pizarra_archivo_tipo = NULL, pizarra_archivo_nombre_original = NULL
         WHERE id = ?`,
        [JSON.stringify(dibujo_json), id]
      );
    }

    res.json({ message: "Ejercicio táctico actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el ejercicio táctico", error: error.message });
  }
};

const eliminarEjercicioTactico = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query(
      "SELECT video_tipo, video_url, pizarra_archivo_url FROM ejercicios_tacticos WHERE id = ?",
      [id]
    );
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio táctico no encontrado" });
    }

    await db.query("DELETE FROM ejercicios_tacticos WHERE id = ?", [id]);

    if (ejercicios[0].video_tipo === "archivo") {
      eliminarArchivo(ejercicios[0].video_url);
    }
    if (ejercicios[0].pizarra_archivo_url) {
      eliminarArchivo(ejercicios[0].pizarra_archivo_url);
    }

    res.json({ message: "Ejercicio táctico eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el ejercicio táctico", error: error.message });
  }
};

const obtenerArchivoVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query(
      "SELECT video_tipo, video_url FROM ejercicios_tacticos WHERE id = ?",
      [id]
    );
    if (ejercicios.length === 0 || ejercicios[0].video_tipo !== "archivo") {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, ejercicios[0].video_url);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el archivo", error: error.message });
  }
};

// Sirve la pizarra táctica cuando se cargó como imagen/video en vez de dibujada.
const obtenerArchivoPizarra = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query(
      "SELECT pizarra_archivo_url FROM ejercicios_tacticos WHERE id = ?",
      [id]
    );
    if (ejercicios.length === 0 || !ejercicios[0].pizarra_archivo_url) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, ejercicios[0].pizarra_archivo_url);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el archivo", error: error.message });
  }
};

module.exports = {
  listarCategorias,
  crearEjercicioTactico,
  listarEjerciciosTacticos,
  obtenerEjercicioTactico,
  actualizarEjercicioTactico,
  eliminarEjercicioTactico,
  obtenerArchivoVideo,
  obtenerArchivoPizarra,
};
