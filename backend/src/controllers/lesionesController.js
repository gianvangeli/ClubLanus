const db = require("../config/db");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

const TIPOS_DOCUMENTO = ["diagnostico", "resonancia", "estudio", "informe", "otro"];

// Registra una nueva lesión (seguimiento médico). Cada lesión es un
// registro propio: nunca reemplaza ni se confunde con una lesión anterior
// del mismo jugador.
const crearLesion = async (req, res) => {
  try {
    const { jugadorId } = req.params;
    const { fecha, lesion, diagnostico, proceso_recuperacion, fecha_alta } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !lesion) {
      return res.status(400).json({ message: "Fecha y lesión son obligatorios" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [jugadorId]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [result] = await db.query(
      `INSERT INTO lesiones (jugador_id, fecha, lesion, diagnostico, proceso_recuperacion, fecha_alta, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [jugadorId, fecha, lesion, diagnostico || null, proceso_recuperacion || null, fecha_alta || null, registradoPor]
    );

    res.status(201).json({
      message: "Lesión registrada correctamente",
      lesion_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar la lesión",
      error: error.message,
    });
  }
};

const listarLesiones = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    const [lesiones] = await db.query(
      `SELECT id, fecha, lesion, diagnostico, proceso_recuperacion, fecha_alta, creado_en
       FROM lesiones
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [jugadorId]
    );

    res.json(lesiones);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar las lesiones",
      error: error.message,
    });
  }
};

// Ficha completa de una lesión: sus datos + los archivos asociados
// (diagnósticos, resonancias, estudios, informes, otros documentos).
const obtenerLesion = async (req, res) => {
  try {
    const { id } = req.params;

    const [lesiones] = await db.query(
      `SELECT id, jugador_id, fecha, lesion, diagnostico, proceso_recuperacion, fecha_alta, creado_en
       FROM lesiones WHERE id = ?`,
      [id]
    );

    if (lesiones.length === 0) {
      return res.status(404).json({ message: "Lesión no encontrada" });
    }

    const [archivos] = await db.query(
      `SELECT id, tipo_documento, nombre_archivo, creado_en
       FROM lesiones_archivos
       WHERE lesion_id = ?
       ORDER BY creado_en DESC, id DESC`,
      [id]
    );

    res.json({ ...lesiones[0], archivos });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la lesión",
      error: error.message,
    });
  }
};

// Edita los datos de una lesión ya existente (por ejemplo, para actualizar
// el proceso de recuperación a medida que avanza). No crea un registro
// nuevo: eso solo pasa cuando el jugador sufre una lesión distinta.
const actualizarLesion = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, lesion, diagnostico, proceso_recuperacion, fecha_alta } = req.body;

    if (!fecha || !lesion) {
      return res.status(400).json({ message: "Fecha y lesión son obligatorios" });
    }

    const [result] = await db.query(
      `UPDATE lesiones
       SET fecha = ?, lesion = ?, diagnostico = ?, proceso_recuperacion = ?, fecha_alta = ?
       WHERE id = ?`,
      [fecha, lesion, diagnostico || null, proceso_recuperacion || null, fecha_alta || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Lesión no encontrada" });
    }

    res.json({ message: "Lesión actualizada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar la lesión",
      error: error.message,
    });
  }
};

// Elimina una lesión y todos sus archivos (por si se cargó por error)
const eliminarLesion = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    const [lesiones] = await conn.query("SELECT id FROM lesiones WHERE id = ?", [id]);
    if (lesiones.length === 0) {
      return res.status(404).json({ message: "Lesión no encontrada" });
    }

    const [archivos] = await conn.query("SELECT archivo FROM lesiones_archivos WHERE lesion_id = ?", [id]);

    await conn.query("DELETE FROM lesiones WHERE id = ?", [id]);

    for (const { archivo } of archivos) {
      eliminarArchivo(archivo);
    }

    res.json({ message: "Lesión eliminada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar la lesión",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// Sube uno o más archivos a una lesión (diagnóstico médico, resonancia,
// estudio, informe médico u otro documento), todos con el mismo tipo. Se
// pueden ir sumando más archivos con el tiempo, a medida que avanza la
// recuperación.
const agregarArchivosLesion = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_documento } = req.body;
    const subidoPor = req.usuario.id;

    if (!TIPOS_DOCUMENTO.includes(tipo_documento)) {
      return res.status(400).json({ message: "Tipo de documento inválido" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Subí al menos un archivo" });
    }

    const [lesiones] = await db.query("SELECT id FROM lesiones WHERE id = ?", [id]);
    if (lesiones.length === 0) {
      return res.status(404).json({ message: "Lesión no encontrada" });
    }

    const idsCreados = [];
    for (const archivo of req.files) {
      const key = await guardarArchivo(archivo.buffer, "lesiones", archivo.originalname);

      const [result] = await db.query(
        `INSERT INTO lesiones_archivos (lesion_id, tipo_documento, nombre_archivo, archivo, subido_por)
         VALUES (?, ?, ?, ?, ?)`,
        [id, tipo_documento, archivo.originalname, key, subidoPor]
      );

      idsCreados.push(result.insertId);
    }

    res.status(201).json({
      message: `${idsCreados.length} archivo(s) agregado(s) correctamente`,
      archivo_ids: idsCreados,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al subir los archivos",
      error: error.message,
    });
  }
};

const obtenerArchivoLesion = async (req, res) => {
  try {
    const { archivoId } = req.params;

    const [archivos] = await db.query(
      "SELECT archivo FROM lesiones_archivos WHERE id = ?",
      [archivoId]
    );

    if (archivos.length === 0) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await servirArchivo(req, res, archivos[0].archivo);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo",
      error: error.message,
    });
  }
};

const eliminarArchivoLesion = async (req, res) => {
  try {
    const { archivoId } = req.params;

    const [archivos] = await db.query(
      "SELECT archivo FROM lesiones_archivos WHERE id = ?",
      [archivoId]
    );

    if (archivos.length === 0) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await db.query("DELETE FROM lesiones_archivos WHERE id = ?", [archivoId]);
    eliminarArchivo(archivos[0].archivo);

    res.json({ message: "Archivo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar el archivo",
      error: error.message,
    });
  }
};

module.exports = {
  crearLesion,
  listarLesiones,
  obtenerLesion,
  actualizarLesion,
  eliminarLesion,
  agregarArchivosLesion,
  obtenerArchivoLesion,
  eliminarArchivoLesion,
};
