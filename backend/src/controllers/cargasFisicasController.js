const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

// Carga un reporte de cargas físicas en PDF para un jugador, con fecha.
const agregarCargaFisica = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, titulo } = req.body;
    const registradoPor = req.usuario.id;

    if (!req.file) {
      return res.status(400).json({ message: "Subí un archivo PDF" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const archivoPdf = await guardarArchivo(req.file.buffer, "cargas-fisicas", req.file.originalname);

    const [result] = await db.query(
      `INSERT INTO cargas_fisicas (jugador_id, fecha, titulo, archivo_pdf, registrado_por)
       VALUES (?, ?, ?, ?, ?)`,
      [id, fecha || new Date(), titulo || null, archivoPdf, registradoPor]
    );

    res.status(201).json({
      message: "Carga física registrada correctamente",
      carga_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar la carga física",
      error: error.message,
    });
  }
};

const listarCargasFisicas = async (req, res) => {
  try {
    const { id } = req.params;

    const [cargas] = await db.query(
      `SELECT id, fecha, titulo, archivo_pdf, creado_en
       FROM cargas_fisicas
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    res.json(cargas);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar las cargas físicas",
      error: error.message,
    });
  }
};

// Sirve el PDF de una carga física. Solo cuerpo técnico.
const obtenerArchivoCargaFisica = async (req, res) => {
  try {
    const { cargaId } = req.params;

    const [cargas] = await db.query(
      "SELECT archivo_pdf FROM cargas_fisicas WHERE id = ?",
      [cargaId]
    );

    if (cargas.length === 0 || !cargas[0].archivo_pdf) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, cargas[0].archivo_pdf);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

// Elimina una carga física puntual (por si se subió el PDF equivocado)
const eliminarCargaFisica = async (req, res) => {
  try {
    const { cargaId } = req.params;

    const [cargas] = await db.query(
      "SELECT archivo_pdf FROM cargas_fisicas WHERE id = ?",
      [cargaId]
    );

    if (cargas.length === 0) {
      return res.status(404).json({ message: "Carga física no encontrada" });
    }

    await db.query("DELETE FROM cargas_fisicas WHERE id = ?", [cargaId]);

    if (cargas[0].archivo_pdf) {
      eliminarArchivo(cargas[0].archivo_pdf);
    }

    res.json({ message: "Carga física eliminada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar la carga física",
      error: error.message,
    });
  }
};

module.exports = {
  agregarCargaFisica,
  listarCargasFisicas,
  obtenerArchivoCargaFisica,
  eliminarCargaFisica,
};
