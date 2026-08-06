const db = require("../config/db");

const CAMPOS_BLOQUE = [
  "fecha",
  "hora_inicio",
  "hora_fin",
  "categoria",
  "titulo",
  "descripcion",
  "espacio",
  "orientacion",
  "pse",
  "objetivo",
  "espacio_trabajo",
  "jugadores_por_tarea",
];

const CATEGORIAS = ["preparador_fisico", "cuerpo_tecnico"];
const ESPACIOS_TRABAJO = ["completa", "media", "reducido"];

// mysql2 devuelve las columnas DATE como objetos Date de JS (construidos en
// hora local), no como texto: String(fecha) da algo tipo "Wed Aug 03 2026
// ...", no "2026-08-03". Se arma la fecha simple a partir de los
// componentes locales (no UTC, para no correrse un día según el huso del
// servidor) para poder comparar contra el "YYYY-MM-DD" que manda el form.
const aFechaSimple = (valor) => {
  const d = new Date(valor);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Alta de una semana nueva (microciclo): el cuerpo técnico elige la fecha
// de inicio y fin, no necesariamente lunes a domingo.
const crearMicrociclo = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, nombre } = req.body;
    const creadoPor = req.usuario.id;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ message: "Inicio y fin de semana son obligatorios" });
    }
    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({ message: "El fin de semana no puede ser anterior al inicio" });
    }

    const [result] = await db.query(
      "INSERT INTO microciclos (fecha_inicio, fecha_fin, nombre, creado_por) VALUES (?, ?, ?, ?)",
      [fecha_inicio, fecha_fin, nombre || null, creadoPor]
    );

    res.status(201).json({ message: "Semana creada correctamente", microciclo_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al crear la semana", error: error.message });
  }
};

// Listado de semanas cargadas, más reciente primero.
const listarMicrociclos = async (req, res) => {
  try {
    const [microciclos] = await db.query(
      `SELECT id, fecha_inicio, fecha_fin, nombre, creado_en FROM microciclos ORDER BY fecha_inicio DESC, id DESC`
    );
    res.json(microciclos);
  } catch (error) {
    res.status(500).json({ message: "Error al listar las semanas", error: error.message });
  }
};

// Detalle de una semana con todos sus bloques, ordenados por día y horario.
const obtenerMicrociclo = async (req, res) => {
  try {
    const { id } = req.params;

    const [microciclos] = await db.query("SELECT * FROM microciclos WHERE id = ?", [id]);
    if (microciclos.length === 0) {
      return res.status(404).json({ message: "Semana no encontrada" });
    }

    const [bloques] = await db.query(
      `SELECT * FROM microciclo_bloques WHERE microciclo_id = ? ORDER BY fecha ASC, hora_inicio ASC`,
      [id]
    );

    res.json({ ...microciclos[0], bloques });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la semana", error: error.message });
  }
};

const eliminarMicrociclo = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM microciclos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Semana no encontrada" });
    }
    res.json({ message: "Semana eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la semana", error: error.message });
  }
};

// Agrega un bloque de trabajo a un día de la semana (horario libre, no hay
// franjas fijas: cada bloque tiene su propio hora_inicio/hora_fin).
const crearBloque = async (req, res) => {
  try {
    const { microcicloId } = req.params;
    const { fecha, hora_inicio, categoria } = req.body;
    const creadoPor = req.usuario.id;

    const [microciclos] = await db.query("SELECT id, fecha_inicio, fecha_fin FROM microciclos WHERE id = ?", [microcicloId]);
    if (microciclos.length === 0) {
      return res.status(404).json({ message: "Semana no encontrada" });
    }

    if (!fecha || !hora_inicio || !categoria) {
      return res.status(400).json({ message: "Fecha, horario de inicio y categoría son obligatorios" });
    }
    if (!CATEGORIAS.includes(categoria)) {
      return res.status(400).json({ message: "Categoría inválida" });
    }
    if (req.body.espacio_trabajo && !ESPACIOS_TRABAJO.includes(req.body.espacio_trabajo)) {
      return res.status(400).json({ message: "Espacio de trabajo inválido" });
    }
    const { fecha_inicio: desde, fecha_fin: hasta } = microciclos[0];
    if (fecha < aFechaSimple(desde) || fecha > aFechaSimple(hasta)) {
      return res.status(400).json({ message: "La fecha del bloque tiene que estar dentro de la semana" });
    }

    const columnas = CAMPOS_BLOQUE.join(", ");
    const placeholders = CAMPOS_BLOQUE.map(() => "?").join(", ");
    const valores = CAMPOS_BLOQUE.map((campo) => req.body[campo] || null);

    const [result] = await db.query(
      `INSERT INTO microciclo_bloques (microciclo_id, ${columnas}, creado_por) VALUES (?, ${placeholders}, ?)`,
      [microcicloId, ...valores, creadoPor]
    );

    res.status(201).json({ message: "Bloque agregado correctamente", bloque_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar el bloque", error: error.message });
  }
};

const actualizarBloque = async (req, res) => {
  try {
    const { bloqueId } = req.params;
    const { categoria } = req.body;

    if (categoria && !CATEGORIAS.includes(categoria)) {
      return res.status(400).json({ message: "Categoría inválida" });
    }
    if (req.body.espacio_trabajo && !ESPACIOS_TRABAJO.includes(req.body.espacio_trabajo)) {
      return res.status(400).json({ message: "Espacio de trabajo inválido" });
    }

    const asignaciones = CAMPOS_BLOQUE.map((campo) => `${campo} = ?`).join(", ");
    const valores = CAMPOS_BLOQUE.map((campo) => req.body[campo] || null);

    const [result] = await db.query(`UPDATE microciclo_bloques SET ${asignaciones} WHERE id = ?`, [...valores, bloqueId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Bloque no encontrado" });
    }

    res.json({ message: "Bloque actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el bloque", error: error.message });
  }
};

const eliminarBloque = async (req, res) => {
  try {
    const { bloqueId } = req.params;
    const [result] = await db.query("DELETE FROM microciclo_bloques WHERE id = ?", [bloqueId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Bloque no encontrado" });
    }
    res.json({ message: "Bloque eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el bloque", error: error.message });
  }
};

module.exports = {
  crearMicrociclo,
  listarMicrociclos,
  obtenerMicrociclo,
  eliminarMicrociclo,
  crearBloque,
  actualizarBloque,
  eliminarBloque,
};
