const db = require("../config/db");

const LIMITE = 30;

// Últimas notificaciones del usuario logueado (cualquier rol), más la
// cantidad de no leídas para el badge de la campana.
const listarNotificaciones = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const [notificaciones] = await db.query(
      `SELECT id, tipo, titulo, ruta, leida, creado_en
       FROM notificaciones
       WHERE usuario_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [usuarioId, LIMITE]
    );

    const [[{ no_leidas }]] = await db.query(
      "SELECT COUNT(*) AS no_leidas FROM notificaciones WHERE usuario_id = ? AND leida = 0",
      [usuarioId]
    );

    res.json({ notificaciones, no_leidas });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las notificaciones",
      error: error.message,
    });
  }
};

const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const [result] = await db.query(
      "UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?",
      [id, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    res.json({ message: "Notificación marcada como leída" });
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar la notificación como leída",
      error: error.message,
    });
  }
};

const marcarTodasLeidas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    await db.query("UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0", [usuarioId]);
    res.json({ message: "Todas las notificaciones fueron marcadas como leídas" });
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar las notificaciones como leídas",
      error: error.message,
    });
  }
};

module.exports = { listarNotificaciones, marcarLeida, marcarTodasLeidas };
