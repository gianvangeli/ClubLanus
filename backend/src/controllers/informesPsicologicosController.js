const db = require("../config/db");

// Confirma que el jugador existe y que el psicólogo logueado es el que
// tiene asignado. Nadie más (cuerpo técnico, dirigencia, el propio
// jugador) puede acceder a los informes psicológicos de nadie.
const estaAsignado = async (jugadorId, psicologoId) => {
  const [jugadores] = await db.query(
    "SELECT id FROM jugadores WHERE id = ? AND psicologo_id = ?",
    [jugadorId, psicologoId]
  );
  return jugadores.length > 0;
};

// Jugadores asignados al psicólogo logueado
const listarMisJugadores = async (req, res) => {
  try {
    const [jugadores] = await db.query(
      "SELECT id, nombre, apellido FROM jugadores WHERE psicologo_id = ? ORDER BY apellido, nombre",
      [req.usuario.id]
    );

    res.json(jugadores);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los jugadores asignados",
      error: error.message,
    });
  }
};

// Datos mínimos de un jugador asignado (para el encabezado de su página de informes)
const obtenerJugadorAsignado = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    const asignado = await estaAsignado(jugadorId, req.usuario.id);
    if (!asignado) {
      return res.status(403).json({ message: "No tenés acceso a este jugador" });
    }

    const [jugadores] = await db.query(
      "SELECT id, nombre, apellido FROM jugadores WHERE id = ?",
      [jugadorId]
    );

    res.json(jugadores[0]);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el jugador",
      error: error.message,
    });
  }
};

// Registra un nuevo informe psicológico. Cada informe es un registro
// propio: nunca se sobrescribe uno anterior, así se arma el historial.
const crearInforme = async (req, res) => {
  try {
    const { jugadorId } = req.params;
    const { fecha, informe, plan_mejora } = req.body;

    if (!fecha || !informe) {
      return res.status(400).json({ message: "Fecha e informe psicológico son obligatorios" });
    }

    const asignado = await estaAsignado(jugadorId, req.usuario.id);
    if (!asignado) {
      return res.status(403).json({ message: "No tenés acceso a los informes de este jugador" });
    }

    const [result] = await db.query(
      `INSERT INTO informes_psicologicos (jugador_id, fecha, informe, plan_mejora, registrado_por)
       VALUES (?, ?, ?, ?, ?)`,
      [jugadorId, fecha, informe, plan_mejora || null, req.usuario.id]
    );

    res.status(201).json({
      message: "Informe psicológico registrado correctamente",
      informe_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar el informe psicológico",
      error: error.message,
    });
  }
};

const listarInformes = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    const asignado = await estaAsignado(jugadorId, req.usuario.id);
    if (!asignado) {
      return res.status(403).json({ message: "No tenés acceso a los informes de este jugador" });
    }

    const [informes] = await db.query(
      `SELECT id, fecha, informe, plan_mejora, creado_en
       FROM informes_psicologicos
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [jugadorId]
    );

    res.json(informes);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los informes psicológicos",
      error: error.message,
    });
  }
};

module.exports = {
  listarMisJugadores,
  obtenerJugadorAsignado,
  crearInforme,
  listarInformes,
};
