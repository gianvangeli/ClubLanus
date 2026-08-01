const db = require("../config/db");

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
    const { categoria, peso_min, peso_max, suma_6_pliegues_objetivo, indice_musculo_oseo_objetivo, imc_objetivo } =
      req.body;
    const actualizadoPor = req.usuario.id;

    if (!categoria || !categoria.trim()) {
      return res.status(400).json({ message: "La categoría es obligatoria" });
    }

    await db.query(
      `INSERT INTO objetivos_nutricionales
         (categoria, peso_min, peso_max, suma_6_pliegues_objetivo, indice_musculo_oseo_objetivo, imc_objetivo, actualizado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         peso_min = VALUES(peso_min),
         peso_max = VALUES(peso_max),
         suma_6_pliegues_objetivo = VALUES(suma_6_pliegues_objetivo),
         indice_musculo_oseo_objetivo = VALUES(indice_musculo_oseo_objetivo),
         imc_objetivo = VALUES(imc_objetivo),
         actualizado_por = VALUES(actualizado_por)`,
      [
        categoria.trim(),
        peso_min || null,
        peso_max || null,
        suma_6_pliegues_objetivo || null,
        indice_musculo_oseo_objetivo || null,
        imc_objetivo || null,
        actualizadoPor,
      ]
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

module.exports = { listarObjetivos, guardarObjetivo, eliminarObjetivo };
