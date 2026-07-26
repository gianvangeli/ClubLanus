const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

const TIPOS_INFORME = ["mensual", "trimestral", "anual"];

// Registra un nuevo informe de análisis futbolístico (técnico/táctico).
// Cada informe es un registro propio: se acumulan cronológicamente, nunca
// se sobrescribe uno anterior.
const crearAnalisis = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, tipo, informe, entrenamientos_recomendados } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !tipo || !informe) {
      return res.status(400).json({ message: "Fecha, tipo de informe e informe son obligatorios" });
    }

    if (!TIPOS_INFORME.includes(tipo)) {
      return res.status(400).json({ message: "Tipo de informe inválido" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    let video = null;
    let nombreVideo = null;
    if (req.file) {
      video = await guardarArchivo(req.file.buffer, "analisis-futbolistico", req.file.originalname);
      nombreVideo = req.file.originalname;
    }

    const [result] = await db.query(
      `INSERT INTO analisis_futbolistico (jugador_id, fecha, tipo, informe, video, nombre_video, entrenamientos_recomendados, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fecha, tipo, informe, video, nombreVideo, entrenamientos_recomendados || null, registradoPor]
    );

    res.status(201).json({
      message: "Informe de análisis futbolístico registrado correctamente",
      analisis_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar el informe",
      error: error.message,
    });
  }
};

const listarAnalisis = async (req, res) => {
  try {
    const { id } = req.params;

    const [analisis] = await db.query(
      `SELECT id, fecha, tipo, informe, nombre_video, entrenamientos_recomendados, creado_en
       FROM analisis_futbolistico
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    res.json(analisis);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los informes",
      error: error.message,
    });
  }
};

const obtenerVideoAnalisis = async (req, res) => {
  try {
    const { analisisId } = req.params;

    const [analisis] = await db.query(
      "SELECT video FROM analisis_futbolistico WHERE id = ?",
      [analisisId]
    );

    if (analisis.length === 0 || !analisis[0].video) {
      return res.status(404).json({ message: "Video no encontrado" });
    }

    await servirArchivo(req, res, analisis[0].video);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el video",
      error: error.message,
    });
  }
};

const eliminarAnalisis = async (req, res) => {
  try {
    const { analisisId } = req.params;

    const [analisis] = await db.query(
      "SELECT video FROM analisis_futbolistico WHERE id = ?",
      [analisisId]
    );

    if (analisis.length === 0) {
      return res.status(404).json({ message: "Informe no encontrado" });
    }

    await db.query("DELETE FROM analisis_futbolistico WHERE id = ?", [analisisId]);

    if (analisis[0].video) {
      eliminarArchivo(analisis[0].video);
    }

    res.json({ message: "Informe eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el informe",
      error: error.message,
    });
  }
};

module.exports = {
  crearAnalisis,
  listarAnalisis,
  obtenerVideoAnalisis,
  eliminarAnalisis,
};
