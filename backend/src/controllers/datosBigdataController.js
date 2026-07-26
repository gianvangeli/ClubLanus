const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

// Registra un nuevo registro de datos estadísticos (partido + datos
// importados + informe). Cada registro es propio: se acumulan
// cronológicamente, nunca se sobrescribe uno anterior.
const crearDatoBigdata = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, partido, informe } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !partido) {
      return res.status(400).json({ message: "Fecha y partido son obligatorios" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    let archivo = null;
    let nombreArchivo = null;
    if (req.file) {
      archivo = await guardarArchivo(req.file.buffer, "datos-bigdata", req.file.originalname);
      nombreArchivo = req.file.originalname;
    }

    const [result] = await db.query(
      `INSERT INTO datos_bigdata (jugador_id, fecha, partido, archivo, nombre_archivo, informe, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, fecha, partido, archivo, nombreArchivo, informe || null, registradoPor]
    );

    res.status(201).json({
      message: "Registro de datos importado correctamente",
      dato_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar los datos",
      error: error.message,
    });
  }
};

const listarDatosBigdata = async (req, res) => {
  try {
    const { id } = req.params;

    const [datos] = await db.query(
      `SELECT id, fecha, partido, nombre_archivo, informe, creado_en
       FROM datos_bigdata
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    res.json(datos);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los datos",
      error: error.message,
    });
  }
};

const obtenerArchivoDatoBigdata = async (req, res) => {
  try {
    const { datoId } = req.params;

    const [datos] = await db.query(
      "SELECT archivo FROM datos_bigdata WHERE id = ?",
      [datoId]
    );

    if (datos.length === 0 || !datos[0].archivo) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, datos[0].archivo);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

const eliminarDatoBigdata = async (req, res) => {
  try {
    const { datoId } = req.params;

    const [datos] = await db.query(
      "SELECT archivo FROM datos_bigdata WHERE id = ?",
      [datoId]
    );

    if (datos.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    await db.query("DELETE FROM datos_bigdata WHERE id = ?", [datoId]);

    if (datos[0].archivo) {
      eliminarArchivo(datos[0].archivo);
    }

    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el registro",
      error: error.message,
    });
  }
};

module.exports = {
  crearDatoBigdata,
  listarDatosBigdata,
  obtenerArchivoDatoBigdata,
  eliminarDatoBigdata,
};
