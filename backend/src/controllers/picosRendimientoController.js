const db = require("../config/db");

// Registra una nueva evaluación de máximo rendimiento. Cada evaluación es
// un registro propio: nunca se sobrescribe una anterior, así se pueden
// comparar entre distintas fechas. Los indicadores se guardan como vengan
// (array de {categoria, indicador, valor}) porque el modelo todavía puede
// ajustarse más adelante.
const crearPico = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, partido, indicadores } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !partido) {
      return res.status(400).json({ message: "Fecha y partido son obligatorios" });
    }

    if (!Array.isArray(indicadores) || indicadores.length === 0) {
      return res.status(400).json({ message: "Cargá al menos un indicador" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [result] = await db.query(
      `INSERT INTO picos_rendimiento (jugador_id, fecha, partido, indicadores, registrado_por)
       VALUES (?, ?, ?, ?, ?)`,
      [id, fecha, partido, JSON.stringify(indicadores), registradoPor]
    );

    res.status(201).json({
      message: "Evaluación registrada correctamente",
      pico_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar la evaluación",
      error: error.message,
    });
  }
};

const listarPicos = async (req, res) => {
  try {
    const { id } = req.params;

    const [picos] = await db.query(
      `SELECT id, fecha, partido, indicadores, creado_en
       FROM picos_rendimiento
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    res.json(picos.map((p) => ({ ...p, indicadores: JSON.parse(p.indicadores) })));
  } catch (error) {
    res.status(500).json({
      message: "Error al listar las evaluaciones",
      error: error.message,
    });
  }
};

const eliminarPico = async (req, res) => {
  try {
    const { picoId } = req.params;

    const [result] = await db.query("DELETE FROM picos_rendimiento WHERE id = ?", [picoId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Evaluación no encontrada" });
    }

    res.json({ message: "Evaluación eliminada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar la evaluación",
      error: error.message,
    });
  }
};

module.exports = { crearPico, listarPicos, eliminarPico };
