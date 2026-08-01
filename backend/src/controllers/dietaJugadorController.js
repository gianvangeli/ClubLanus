const db = require("../config/db");

// Dieta personalizada: informe único y permanente por jugador (no
// histórico). Independiente de las evaluaciones y de los objetivos de la
// categoría.
const obtenerDieta = async (req, res) => {
  try {
    const { id } = req.params;

    const [dietas] = await db.query("SELECT plan, actualizado_en FROM dietas_jugador WHERE jugador_id = ?", [id]);

    res.json(dietas[0] || { plan: null, actualizado_en: null });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la dieta",
      error: error.message,
    });
  }
};

// Guarda la dieta in place: si no existe la crea, si ya existe la
// actualiza. Nunca genera un registro nuevo, siempre es el mismo.
const guardarDieta = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    const actualizadoPor = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    await db.query(
      `INSERT INTO dietas_jugador (jugador_id, plan, actualizado_por)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE plan = VALUES(plan), actualizado_por = VALUES(actualizado_por)`,
      [id, plan || null, actualizadoPor]
    );

    res.json({ message: "Dieta guardada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar la dieta",
      error: error.message,
    });
  }
};

module.exports = { obtenerDieta, guardarDieta };
