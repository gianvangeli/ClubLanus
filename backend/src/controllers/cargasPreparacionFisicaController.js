const db = require("../config/db");

// Registro simple de cargas físicas dentro de Preparación física (fecha +
// entrenamiento/partido + observaciones). Distinto del módulo de Cargas
// Físicas en PDF que ya existe en la ficha del jugador.
const crearCargaPreparacionFisica = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, entrenamiento_partido, observaciones } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !entrenamiento_partido) {
      return res.status(400).json({ message: "Fecha y entrenamiento/partido son obligatorios" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [result] = await db.query(
      `INSERT INTO cargas_preparacion_fisica (jugador_id, fecha, entrenamiento_partido, observaciones, registrado_por)
       VALUES (?, ?, ?, ?, ?)`,
      [id, fecha, entrenamiento_partido, observaciones || null, registradoPor]
    );

    res.status(201).json({
      message: "Carga física registrada correctamente",
      carga_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar la carga física",
      error: error.message,
    });
  }
};

const listarCargasPreparacionFisica = async (req, res) => {
  try {
    const { id } = req.params;

    const [cargas] = await db.query(
      `SELECT id, fecha, entrenamiento_partido, observaciones, creado_en
       FROM cargas_preparacion_fisica
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    res.json(cargas);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar las cargas físicas",
      error: error.message,
    });
  }
};

const eliminarCargaPreparacionFisica = async (req, res) => {
  try {
    const { cargaId } = req.params;

    const [result] = await db.query("DELETE FROM cargas_preparacion_fisica WHERE id = ?", [cargaId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Carga física no encontrada" });
    }

    res.json({ message: "Carga física eliminada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar la carga física",
      error: error.message,
    });
  }
};

module.exports = {
  crearCargaPreparacionFisica,
  listarCargasPreparacionFisica,
  eliminarCargaPreparacionFisica,
};
