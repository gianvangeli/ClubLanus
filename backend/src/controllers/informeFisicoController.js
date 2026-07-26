const db = require("../config/db");

// Informe físico (portada): único y permanente por jugador (no
// histórico). Describe fortalezas, debilidades, aspectos a mantener y
// aspectos a mejorar desde lo físico.
const obtenerInformeFisico = async (req, res) => {
  try {
    const { id } = req.params;

    const [informes] = await db.query(
      `SELECT fortalezas, debilidades, aspectos_mantener, aspectos_mejorar, actualizado_en
       FROM informes_fisicos WHERE jugador_id = ?`,
      [id]
    );

    res.json(
      informes[0] || {
        fortalezas: null,
        debilidades: null,
        aspectos_mantener: null,
        aspectos_mejorar: null,
        actualizado_en: null,
      }
    );
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el informe físico",
      error: error.message,
    });
  }
};

// Guarda el informe físico in place: si no existe lo crea, si ya existe lo
// actualiza. Nunca genera un registro nuevo, siempre es el mismo.
const guardarInformeFisico = async (req, res) => {
  try {
    const { id } = req.params;
    const { fortalezas, debilidades, aspectos_mantener, aspectos_mejorar } = req.body;
    const actualizadoPor = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    await db.query(
      `INSERT INTO informes_fisicos (jugador_id, fortalezas, debilidades, aspectos_mantener, aspectos_mejorar, actualizado_por)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         fortalezas = VALUES(fortalezas),
         debilidades = VALUES(debilidades),
         aspectos_mantener = VALUES(aspectos_mantener),
         aspectos_mejorar = VALUES(aspectos_mejorar),
         actualizado_por = VALUES(actualizado_por)`,
      [
        id,
        fortalezas || null,
        debilidades || null,
        aspectos_mantener || null,
        aspectos_mejorar || null,
        actualizadoPor,
      ]
    );

    res.json({ message: "Informe físico guardado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar el informe físico",
      error: error.message,
    });
  }
};

module.exports = { obtenerInformeFisico, guardarInformeFisico };
