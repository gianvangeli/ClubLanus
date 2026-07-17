const db = require("../config/db");

// Los ejercicios son material de planificación exclusivo del cuerpo técnico:
// el jugador nunca accede a estas rutas (ver entrenamientosRoutes/autorizarRoles).

const CAMPOS_EDITABLES = [
  "dia",
  "sesion_numero",
  "turno",
  "tipo_trabajo",
  "espacio",
  "materiales",
  "objetivo",
  "n_jugadores",
  "duracion",
  "descripcion",
  "puntuacion",
  "entrenador_a_cargo",
  "jugadores",
  "pechera",
];

// Alta de un nuevo ejercicio en blanco para la sesión: se numera
// correlativamente ("Ejercicio 01", "02"...) según los que ya existan.
const crearEjercicio = async (req, res) => {
  try {
    const { entrenamientoId } = req.params;
    const creadoPor = req.usuario.id;

    const [entrenamientos] = await db.query("SELECT id, fecha FROM entrenamientos WHERE id = ?", [entrenamientoId]);
    if (entrenamientos.length === 0) {
      return res.status(404).json({ message: "Entrenamiento no encontrado" });
    }

    const [[{ siguiente }]] = await db.query(
      "SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM ejercicios WHERE entrenamiento_id = ?",
      [entrenamientoId]
    );

    const [result] = await db.query(
      "INSERT INTO ejercicios (entrenamiento_id, numero, dia, creado_por) VALUES (?, ?, ?, ?)",
      [entrenamientoId, siguiente, entrenamientos[0].fecha, creadoPor]
    );

    res.status(201).json({
      message: "Ejercicio creado correctamente",
      ejercicio_id: result.insertId,
      numero: siguiente,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el ejercicio", error: error.message });
  }
};

// Listado de ejercicios de una sesión (para armar las "subpáginas")
const listarEjercicios = async (req, res) => {
  try {
    const { entrenamientoId } = req.params;
    const [ejercicios] = await db.query(
      `SELECT id, numero, tipo_trabajo, objetivo, creado_en
       FROM ejercicios WHERE entrenamiento_id = ? ORDER BY numero ASC`,
      [entrenamientoId]
    );
    res.json(ejercicios);
  } catch (error) {
    res.status(500).json({ message: "Error al listar los ejercicios", error: error.message });
  }
};

const obtenerEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const [ejercicios] = await db.query("SELECT * FROM ejercicios WHERE id = ?", [id]);
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    const ejercicio = ejercicios[0];
    ejercicio.dibujo_json = ejercicio.dibujo_json ? JSON.parse(ejercicio.dibujo_json) : null;

    res.json(ejercicio);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el ejercicio", error: error.message });
  }
};

// Edita los campos de la planilla y/o el dibujo táctico (escena completa en JSON)
const actualizarEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { dibujo_json } = req.body;

    const [ejercicios] = await db.query("SELECT id FROM ejercicios WHERE id = ?", [id]);
    if (ejercicios.length === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    const asignaciones = CAMPOS_EDITABLES.map((campo) => `${campo} = ?`).join(", ");
    const valores = CAMPOS_EDITABLES.map((campo) => req.body[campo] || null);

    await db.query(
      `UPDATE ejercicios SET ${asignaciones}, dibujo_json = COALESCE(?, dibujo_json) WHERE id = ?`,
      [...valores, dibujo_json !== undefined ? JSON.stringify(dibujo_json) : null, id]
    );

    res.json({ message: "Ejercicio actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el ejercicio", error: error.message });
  }
};

const eliminarEjercicio = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM ejercicios WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }
    res.json({ message: "Ejercicio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el ejercicio", error: error.message });
  }
};

module.exports = {
  crearEjercicio,
  listarEjercicios,
  obtenerEjercicio,
  actualizarEjercicio,
  eliminarEjercicio,
};
