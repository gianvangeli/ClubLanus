const db = require("../config/db");
const { guardarArchivoDesdeRuta, servirArchivo, eliminarArchivo } = require("../config/storage");

// Taxonomía fija de "Entrenamientos desglosados" > ejercicios tácticos.
// Si en el futuro se agrega una categoría o sub-categoría nueva, alcanza
// con sumarla acá (no requiere migración, categoria/subcategoria son texto).
const SUBCATEGORIAS = {
  rondos: [
    "+5",
    "+10",
    "+15",
    "+20",
    "Preestablecido",
    "Ruta de pases",
    "Específico Ofensivo",
    "Específico Defensivo",
    "Posesiones",
    "Salidas progresivas",
  ],
  pelota_parada: [
    "ABP (en contra)",
    "Corner por derecha",
    "Corner por izquierda",
    "Tiro libre lateral",
    "Tiro libre semi-frontal",
    "Tiro libre frontal",
  ],
};

const CATEGORIAS = Object.keys(SUBCATEGORIAS);

const validarCategoria = (categoria, subcategoria) => {
  if (!CATEGORIAS.includes(categoria)) return "Categoría inválida";
  if (!SUBCATEGORIAS[categoria].includes(subcategoria)) return "Sub-categoría inválida";
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
    const { categoria, subcategoria, titulo, fecha, descripcion, cantidad_jugadores, url_video, dibujo_json } =
      req.body;
    const creadoPor = req.usuario.id;

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

    if (req.file) {
      videoTipo = "archivo";
      videoUrl = await guardarArchivoDesdeRuta(req.file.path, "ejercicios-tacticos", req.file.originalname);
      videoNombre = req.file.originalname;
    } else if (url_video && url_video.trim()) {
      videoTipo = "link";
      videoUrl = url_video.trim();
    }

    // dibujo_json llega como string (multipart/form-data): se valida que sea
    // JSON válido antes de guardarlo tal cual.
    let dibujoGuardar = null;
    if (dibujo_json) {
      try {
        JSON.parse(dibujo_json);
        dibujoGuardar = dibujo_json;
      } catch {
        return res.status(400).json({ message: "La pizarra táctica no tiene un formato válido" });
      }
    }

    const [result] = await db.query(
      `INSERT INTO ejercicios_tacticos
       (categoria, subcategoria, titulo, fecha, descripcion, cantidad_jugadores, video_tipo, video_url, video_nombre_original, dibujo_json, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        creadoPor,
      ]
    );

    res.status(201).json({ message: "Ejercicio táctico creado correctamente", id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el ejercicio táctico", error: error.message });
  }
};

// Listado de una categoría/sub-categoría puntual (para todo el plantel).
const listarEjerciciosTacticos = async (req, res) => {
  try {
    const { categoria, subcategoria } = req.query;

    const errorCategoria = validarCategoria(categoria, subcategoria);
    if (errorCategoria) {
      return res.status(400).json({ message: errorCategoria });
    }

    const [ejercicios] = await db.query(
      `SELECT id, titulo, fecha, cantidad_jugadores, creado_en
       FROM ejercicios_tacticos
       WHERE categoria = ? AND subcategoria = ?
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

    const [ejercicios] = await db.query("SELECT * FROM ejercicios_tacticos WHERE id = ?", [id]);
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

// Edita los datos y/o la pizarra táctica (dibujo_json) de un ejercicio ya cargado.
const actualizarEjercicioTactico = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, fecha, descripcion, cantidad_jugadores, dibujo_json } = req.body;

    const [ejercicios] = await db.query("SELECT id FROM ejercicios_tacticos WHERE id = ?", [id]);
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio táctico no encontrado" });
    }

    await db.query(
      `UPDATE ejercicios_tacticos
       SET titulo = COALESCE(?, titulo),
           fecha = ?,
           descripcion = ?,
           cantidad_jugadores = ?,
           dibujo_json = COALESCE(?, dibujo_json)
       WHERE id = ?`,
      [
        titulo || null,
        fecha || null,
        descripcion || null,
        cantidad_jugadores || null,
        dibujo_json !== undefined ? JSON.stringify(dibujo_json) : null,
        id,
      ]
    );

    res.json({ message: "Ejercicio táctico actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el ejercicio táctico", error: error.message });
  }
};

const eliminarEjercicioTactico = async (req, res) => {
  try {
    const { id } = req.params;

    const [ejercicios] = await db.query(
      "SELECT video_tipo, video_url FROM ejercicios_tacticos WHERE id = ?",
      [id]
    );
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio táctico no encontrado" });
    }

    await db.query("DELETE FROM ejercicios_tacticos WHERE id = ?", [id]);

    if (ejercicios[0].video_tipo === "archivo") {
      eliminarArchivo(ejercicios[0].video_url);
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

module.exports = {
  listarCategorias,
  crearEjercicioTactico,
  listarEjerciciosTacticos,
  obtenerEjercicioTactico,
  actualizarEjercicioTactico,
  eliminarEjercicioTactico,
  obtenerArchivoVideo,
};
