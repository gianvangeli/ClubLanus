const db = require("../config/db");

// Biblioteca de "jugadas" guardadas desde la Pizarra Táctica: tableros
// (dibujo_json, formato v2 de escenas) con nombre propio, reutilizables en
// cualquier ejercicio/pizarra, no atados a una sesión puntual.

const listarJugadas = async (req, res) => {
  try {
    const [jugadas] = await db.query(
      "SELECT id, titulo, creado_en FROM pizarra_jugadas ORDER BY creado_en DESC, id DESC"
    );
    res.json(jugadas);
  } catch (error) {
    res.status(500).json({ message: "Error al listar las jugadas guardadas", error: error.message });
  }
};

const crearJugada = async (req, res) => {
  try {
    const { titulo, dibujo_json } = req.body;
    const creadoPor = req.usuario.id;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ message: "El título es obligatorio" });
    }
    if (!dibujo_json) {
      return res.status(400).json({ message: "Falta el dibujo de la pizarra" });
    }
    try {
      JSON.parse(dibujo_json);
    } catch {
      return res.status(400).json({ message: "La pizarra táctica no tiene un formato válido" });
    }

    const [result] = await db.query(
      "INSERT INTO pizarra_jugadas (titulo, dibujo_json, creado_por) VALUES (?, ?, ?)",
      [titulo.trim(), dibujo_json, creadoPor]
    );

    res.status(201).json({ message: "Jugada guardada correctamente", id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al guardar la jugada", error: error.message });
  }
};

const obtenerJugada = async (req, res) => {
  try {
    const { id } = req.params;

    const [jugadas] = await db.query(
      "SELECT id, titulo, dibujo_json, creado_en FROM pizarra_jugadas WHERE id = ?",
      [id]
    );
    if (jugadas.length === 0) {
      return res.status(404).json({ message: "Jugada no encontrada" });
    }

    const jugada = jugadas[0];
    jugada.dibujo_json = JSON.parse(jugada.dibujo_json);

    res.json(jugada);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la jugada", error: error.message });
  }
};

const eliminarJugada = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM pizarra_jugadas WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Jugada no encontrada" });
    }

    res.json({ message: "Jugada eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la jugada", error: error.message });
  }
};

module.exports = {
  listarJugadas,
  crearJugada,
  obtenerJugada,
  eliminarJugada,
};
