const db = require("../config/db");

// Punto único para generar notificaciones desde cualquier controller. Nunca
// tira si falla (quien llama no debería ver rota su acción principal solo
// porque no se pudo avisar): cada función atrapa sus propios errores y los
// loguea, no los propaga.
const crearNotificacion = async (usuarioId, tipo, titulo, ruta) => {
  if (!usuarioId) return;
  try {
    await db.query(
      "INSERT INTO notificaciones (usuario_id, tipo, titulo, ruta) VALUES (?, ?, ?, ?)",
      [usuarioId, tipo, titulo, ruta]
    );
  } catch (error) {
    console.error("Error al crear notificación:", error.message);
  }
};

// Notifica al jugador a partir de su jugador_id (resuelve la cuenta
// vinculada; si todavía no tiene cuenta de usuario, no hace nada).
const notificarJugador = async (jugadorId, tipo, titulo, ruta) => {
  try {
    const [jugadores] = await db.query("SELECT usuario_id FROM jugadores WHERE id = ?", [jugadorId]);
    await crearNotificacion(jugadores[0]?.usuario_id, tipo, titulo, ruta);
  } catch (error) {
    console.error("Error al notificar al jugador:", error.message);
  }
};

const notificarJugadores = async (jugadorIds, tipo, titulo, ruta) => {
  for (const jugadorId of jugadorIds) {
    await notificarJugador(jugadorId, tipo, titulo, ruta);
  }
};

// Notifica a todos los jugadores que tengan cuenta de usuario vinculada.
const notificarTodosLosJugadores = async (tipo, titulo, ruta) => {
  try {
    const [jugadores] = await db.query("SELECT usuario_id FROM jugadores WHERE usuario_id IS NOT NULL");
    for (const { usuario_id } of jugadores) {
      await crearNotificacion(usuario_id, tipo, titulo, ruta);
    }
  } catch (error) {
    console.error("Error al notificar a todos los jugadores:", error.message);
  }
};

module.exports = {
  crearNotificacion,
  notificarJugador,
  notificarJugadores,
  notificarTodosLosJugadores,
};
