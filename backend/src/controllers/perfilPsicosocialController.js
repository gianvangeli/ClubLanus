const db = require("../config/db");

// Perfil psicosocial: un único informe permanente por jugador (no
// histórico). Describe al jugador desde lo psicológico y social; es
// trabajo del cuerpo técnico/dirigencia, no de los informes confidenciales
// del psicólogo.
const obtenerPerfilPsicosocial = async (req, res) => {
  try {
    const { id } = req.params;

    const [perfiles] = await db.query(
      "SELECT contenido, actualizado_en FROM perfiles_psicosociales WHERE jugador_id = ?",
      [id]
    );

    res.json(perfiles[0] || { contenido: null, actualizado_en: null });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el perfil psicosocial",
      error: error.message,
    });
  }
};

// Guarda el perfil psicosocial in place: si no existe lo crea, si ya
// existe lo actualiza. Nunca genera un registro nuevo, siempre es el mismo.
const guardarPerfilPsicosocial = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;
    const actualizadoPor = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    await db.query(
      `INSERT INTO perfiles_psicosociales (jugador_id, contenido, actualizado_por)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE contenido = VALUES(contenido), actualizado_por = VALUES(actualizado_por)`,
      [id, contenido || null, actualizadoPor]
    );

    res.json({ message: "Perfil psicosocial guardado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar el perfil psicosocial",
      error: error.message,
    });
  }
};

module.exports = { obtenerPerfilPsicosocial, guardarPerfilPsicosocial };
