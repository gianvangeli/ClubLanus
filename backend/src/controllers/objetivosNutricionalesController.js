const db = require("../config/db");
const { claveDePeriodo, etiquetaDePeriodo } = require("../utils/periodos");

// Objetivos nutricionales por categoría: configuración exclusiva de
// CT/admin. No se editan desde la ficha del jugador (esa página solo los
// muestra como referencia).
const listarObjetivos = async (req, res) => {
  try {
    const [objetivos] = await db.query("SELECT * FROM objetivos_nutricionales ORDER BY categoria");
    res.json(objetivos);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los objetivos nutricionales",
      error: error.message,
    });
  }
};

// Alta o edición de los objetivos de una categoría (una fila por
// categoría: si ya existe se actualiza, si no se crea).
const guardarObjetivo = async (req, res) => {
  try {
    const { categoria, suma_6_pliegues_objetivo, indice_musculo_oseo_objetivo } = req.body;
    const actualizadoPor = req.usuario.id;

    if (!categoria || !categoria.trim()) {
      return res.status(400).json({ message: "La categoría es obligatoria" });
    }

    await db.query(
      `INSERT INTO objetivos_nutricionales
         (categoria, suma_6_pliegues_objetivo, indice_musculo_oseo_objetivo, actualizado_por)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         suma_6_pliegues_objetivo = VALUES(suma_6_pliegues_objetivo),
         indice_musculo_oseo_objetivo = VALUES(indice_musculo_oseo_objetivo),
         actualizado_por = VALUES(actualizado_por)`,
      [categoria.trim(), suma_6_pliegues_objetivo || null, indice_musculo_oseo_objetivo || null, actualizadoPor]
    );

    res.json({ message: "Objetivos guardados correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar los objetivos",
      error: error.message,
    });
  }
};

const eliminarObjetivo = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM objetivos_nutricionales WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Objetivo no encontrado" });
    }
    res.json({ message: "Objetivo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el objetivo",
      error: error.message,
    });
  }
};

// Reporte grupal de una categoría: arma solo el programa, a partir de las
// evaluaciones ya cargadas de cada jugador (no se sube nada acá) —
// Peso/Suma 6 pliegues/IMO por jugador, agrupados por período. Si un
// jugador tiene más de una evaluación en el mismo período, queda la más
// reciente (las evaluaciones vienen ordenadas ASC, así que la última pisa).
const obtenerReporteGrupalNutricion = async (req, res) => {
  try {
    const { categoria, periodo } = req.query;
    if (!categoria) {
      return res.status(400).json({ message: "Falta la categoría" });
    }
    const periodoValido = ["semana", "quincena", "mes"].includes(periodo) ? periodo : "mes";

    const [jugadores] = await db.query(
      "SELECT id, nombre, apellido FROM jugadores WHERE categoria = ? ORDER BY apellido, nombre",
      [categoria]
    );
    if (jugadores.length === 0) {
      return res.json({ periodos: [], jugadores: [] });
    }

    const [evaluaciones] = await db.query(
      `SELECT jugador_id, fecha, peso, sumatoria_pliegues, indice_musculo_oseo
       FROM nutricion_evaluaciones
       WHERE jugador_id IN (?)
       ORDER BY fecha ASC, id ASC`,
      [jugadores.map((j) => j.id)]
    );

    const valoresPorJugador = {};
    jugadores.forEach((j) => {
      valoresPorJugador[j.id] = {};
    });

    const clavesSet = new Set();
    evaluaciones.forEach((ev) => {
      const clave = claveDePeriodo(ev.fecha, periodoValido);
      clavesSet.add(clave);
      valoresPorJugador[ev.jugador_id][clave] = {
        peso: ev.peso,
        sumatoria_pliegues: ev.sumatoria_pliegues,
        indice_musculo_oseo: ev.indice_musculo_oseo,
      };
    });

    const periodos = Array.from(clavesSet)
      .sort()
      .map((clave) => ({ clave, etiqueta: etiquetaDePeriodo(clave, periodoValido) }));

    res.json({
      periodos,
      jugadores: jugadores.map((j) => ({ ...j, valores: valoresPorJugador[j.id] })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar el reporte grupal",
      error: error.message,
    });
  }
};

module.exports = { listarObjetivos, guardarObjetivo, eliminarObjetivo, obtenerReporteGrupalNutricion };
