const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { guardarArchivo, eliminarArchivo } = require("../config/storage");

// Posiciones válidas para el gráfico de cancha (ver POSICIONES_CANCHA en el frontend)
const POSICIONES_CANCHA = [
  "Arquero",
  "Defensor",
  "Lateral Derecho",
  "Lateral Izquierdo",
  "Volante Defensivo",
  "Volante",
  "Volante Ofensivo",
  "Extremo Derecho",
  "Extremo Izquierdo",
  "Delantero",
];

// Alta de jugador (ficha del cuerpo técnico): nombre, apellido, edad, altura.
// El peso no se carga acá: se registra desde la ficha del jugador como una
// medición de composición corporal (peso + % grasa corporal).
// No requiere una cuenta de usuario todavía: se crea después con
// crearCuentaJugador, pidiéndole el mail al jugador.
const crearJugador = async (req, res) => {
  try {
    const { nombre, apellido, edad, altura, usuario_id } = req.body;

    if (!nombre || !apellido) {
      return res.status(400).json({ message: "Nombre y apellido son obligatorios" });
    }

    const [result] = await db.query(
      `INSERT INTO jugadores (usuario_id, nombre, apellido, edad, altura)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id || null, nombre, apellido, edad || null, altura || null]
    );

    res.status(201).json({
      message: "Jugador registrado correctamente",
      jugador_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar jugador",
      error: error.message,
    });
  }
};

const listarJugadores = async (req, res) => {
  try {
    const [jugadores] = await db.query(
      `SELECT id, usuario_id, nombre, apellido, edad, peso, altura, posicion, categoria, division_nombre, creado_en
       FROM jugadores
       ORDER BY apellido, nombre`
    );

    res.json(jugadores);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar jugadores",
      error: error.message,
    });
  }
};

// Crea la cuenta de acceso del jugador (rol 'jugador') a partir de su mail,
// la vincula a la ficha y devuelve una contraseña provisoria generada al
// azar para que el cuerpo técnico se la comparta al jugador. El jugador no
// se registra por sí mismo: la cuenta la da de alta el cuerpo técnico.
const crearCuentaJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Falta el mail del jugador" });
    }

    const [jugadores] = await db.query("SELECT id, nombre, apellido, usuario_id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }
    if (jugadores[0].usuario_id) {
      return res.status(409).json({ message: "Este jugador ya tiene una cuenta vinculada" });
    }

    const [existentes] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existentes.length > 0) {
      return res.status(409).json({ message: "Ya existe una cuenta con ese mail" });
    }

    const passwordProvisoria = crypto.randomBytes(6).toString("base64url");
    const hashedPassword = await bcrypt.hash(passwordProvisoria, 10);
    const nombreCompleto = `${jugadores[0].nombre} ${jugadores[0].apellido}`;

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'jugador')",
      [nombreCompleto, email, hashedPassword]
    );

    await db.query("UPDATE jugadores SET usuario_id = ? WHERE id = ?", [result.insertId, id]);

    res.status(201).json({
      message: "Cuenta creada y vinculada correctamente",
      email,
      password: passwordProvisoria,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear la cuenta del jugador",
      error: error.message,
    });
  }
};

// Vincula una ficha de jugador con una cuenta de usuario ya existente
const vincularUsuario = async (req, res) => {
  try {
    const jugadorId = req.params.id;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: "Falta usuario_id" });
    }

    const [usuarios] = await db.query(
      "SELECT id FROM usuarios WHERE id = ? AND rol = 'jugador'",
      [usuario_id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: "No existe un usuario jugador con ese id" });
    }

    await db.query("UPDATE jugadores SET usuario_id = ? WHERE id = ?", [
      usuario_id,
      jugadorId,
    ]);

    res.json({
      message: "Jugador vinculado a su usuario correctamente",
      jugador_id: Number(jugadorId),
      usuario_id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al vincular jugador",
      error: error.message,
    });
  }
};

// Ficha completa de un jugador: datos + última medición de composición corporal
const obtenerJugador = async (req, res) => {
  try {
    const { id } = req.params;

    const [jugadores] = await db.query(
      `SELECT j.id, j.usuario_id, j.nombre, j.apellido, j.edad, j.peso, j.altura, j.nacionalidad_1, j.nacionalidad_2, j.posicion, j.categoria, j.division_nombre,
              j.contrato, j.agente_nombre, j.agente_apellido, j.agente_mail, j.agente_telefono,
              j.contacto_emergencia_nombre, j.contacto_emergencia_apellido, j.contacto_emergencia_relacion, j.contacto_emergencia_telefono,
              j.pie, j.posiciones_cancha, j.partidos_jugados,
              j.creado_en, u.email AS usuario_email
       FROM jugadores j
       LEFT JOIN usuarios u ON u.id = j.usuario_id
       WHERE j.id = ?`,
      [id]
    );

    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const jugador = jugadores[0];
    jugador.posiciones_cancha = jugador.posiciones_cancha ? JSON.parse(jugador.posiciones_cancha) : [];

    res.json(jugador);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el jugador",
      error: error.message,
    });
  }
};

// Edita los datos de la ficha (el peso se carga aparte, vía composición corporal)
const actualizarJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      edad,
      altura,
      nacionalidad_1,
      nacionalidad_2,
      posicion,
      categoria,
      division_nombre,
      contrato,
    } = req.body;

    if (!nombre || !apellido) {
      return res.status(400).json({ message: "Nombre y apellido son obligatorios" });
    }

    if (contrato && !["si", "no"].includes(contrato)) {
      return res.status(400).json({ message: "Contrato tiene que ser 'si' o 'no'" });
    }

    const [result] = await db.query(
      `UPDATE jugadores
       SET nombre = ?, apellido = ?, edad = ?, altura = ?, nacionalidad_1 = ?, nacionalidad_2 = ?,
           posicion = ?, categoria = ?, division_nombre = ?, contrato = ?
       WHERE id = ?`,
      [
        nombre,
        apellido,
        edad || null,
        altura || null,
        nacionalidad_1 || null,
        nacionalidad_2 || null,
        posicion || null,
        categoria || null,
        division_nombre || null,
        contrato || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    res.json({ message: "Jugador actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el jugador",
      error: error.message,
    });
  }
};

// Elimina la ficha de un jugador (por si el cuerpo técnico se equivocó al
// cargarlo). Borra en cascada todo lo que depende de él: composición
// corporal, videos individuales (y su archivo en disco si no lo usa nadie
// más) y las tablas legadas con FK hacia jugadores.
const eliminarJugador = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    const [jugadores] = await conn.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    await conn.beginTransaction();

    const [videosDelJugador] = await conn.query(
      "SELECT video_id FROM video_jugadores WHERE jugador_id = ?",
      [id]
    );

    await conn.query("DELETE FROM video_jugadores WHERE jugador_id = ?", [id]);
    await conn.query("DELETE FROM composicion_corporal WHERE jugador_id = ?", [id]);
    await conn.query("DELETE FROM cargas_fisicas WHERE jugador_id = ?", [id]);
    await conn.query("DELETE FROM entrenamiento_jugadores WHERE jugador_id = ?", [id]);
    await conn.query("DELETE FROM informes WHERE jugador_id = ?", [id]);

    const archivosABorrar = [];
    for (const { video_id } of videosDelJugador) {
      const [[{ total }]] = await conn.query(
        `SELECT
           (SELECT COUNT(*) FROM video_jugadores WHERE video_id = ?) +
           (SELECT COUNT(*) FROM biblioteca_videos WHERE video_id = ?) AS total`,
        [video_id, video_id]
      );

      if (total === 0) {
        const [videoRows] = await conn.query("SELECT tipo, url_video FROM videos WHERE id = ?", [video_id]);
        if (videoRows[0]?.tipo === "archivo") {
          archivosABorrar.push(videoRows[0].url_video);
        }
        await conn.query("DELETE FROM videos WHERE id = ?", [video_id]);
      }
    }

    await conn.query("DELETE FROM jugadores WHERE id = ?", [id]);

    await conn.commit();

    for (const urlVideo of archivosABorrar) {
      eliminarArchivo(urlVideo);
    }

    res.json({ message: "Jugador eliminado correctamente" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      message: "Error al eliminar el jugador",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// Carga/edita los datos del agente del jugador (nombre, apellido, mail, teléfono)
const actualizarAgente = async (req, res) => {
  try {
    const { id } = req.params;
    const { agente_nombre, agente_apellido, agente_mail, agente_telefono } = req.body;

    const [result] = await db.query(
      `UPDATE jugadores
       SET agente_nombre = ?, agente_apellido = ?, agente_mail = ?, agente_telefono = ?
       WHERE id = ?`,
      [agente_nombre || null, agente_apellido || null, agente_mail || null, agente_telefono || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    res.json({ message: "Agente guardado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar el agente",
      error: error.message,
    });
  }
};

// Carga/edita el contacto de emergencia del jugador (nombre, apellido, relación, teléfono)
const actualizarContactoEmergencia = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contacto_emergencia_nombre,
      contacto_emergencia_apellido,
      contacto_emergencia_relacion,
      contacto_emergencia_telefono,
    } = req.body;

    const [result] = await db.query(
      `UPDATE jugadores
       SET contacto_emergencia_nombre = ?, contacto_emergencia_apellido = ?,
           contacto_emergencia_relacion = ?, contacto_emergencia_telefono = ?
       WHERE id = ?`,
      [
        contacto_emergencia_nombre || null,
        contacto_emergencia_apellido || null,
        contacto_emergencia_relacion || null,
        contacto_emergencia_telefono || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    res.json({ message: "Contacto de emergencia guardado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar el contacto de emergencia",
      error: error.message,
    });
  }
};

// Carga/edita las características del jugador: pie hábil, sectores de la
// cancha que ocupa (uno o más) y partidos jugados. Los minutos jugados y
// minutos por partido se llevan en Cargas Físicas, no acá.
const actualizarCaracteristicas = async (req, res) => {
  try {
    const { id } = req.params;
    const { pie, partidos_jugados } = req.body;
    const posicionesCancha = Array.isArray(req.body.posiciones_cancha)
      ? req.body.posiciones_cancha
      : [req.body.posiciones_cancha].filter(Boolean);

    if (pie && !["derecho", "izquierdo"].includes(pie)) {
      return res.status(400).json({ message: "Pie tiene que ser 'derecho' o 'izquierdo'" });
    }

    if (posicionesCancha.some((p) => !POSICIONES_CANCHA.includes(p))) {
      return res.status(400).json({ message: "Posición inválida" });
    }

    const [result] = await db.query(
      `UPDATE jugadores
       SET pie = ?, posiciones_cancha = ?, partidos_jugados = ?
       WHERE id = ?`,
      [
        pie || null,
        posicionesCancha.length > 0 ? JSON.stringify(posicionesCancha) : null,
        partidos_jugados || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    res.json({ message: "Características guardadas correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar las características",
      error: error.message,
    });
  }
};

// Carga una nueva medición de peso + % de grasa corporal.
// También actualiza jugadores.peso para que la tabla del plantel muestre el último valor.
const agregarComposicion = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, peso, grasa_corporal_pct, observaciones } = req.body;
    const registradoPor = req.usuario.id;

    if (!peso) {
      return res.status(400).json({ message: "El peso es obligatorio" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [result] = await db.query(
      `INSERT INTO composicion_corporal (jugador_id, fecha, peso, grasa_corporal_pct, observaciones, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, fecha || new Date(), peso, grasa_corporal_pct || null, observaciones || null, registradoPor]
    );

    await db.query("UPDATE jugadores SET peso = ? WHERE id = ?", [peso, id]);

    res.status(201).json({
      message: "Medición registrada correctamente",
      composicion_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar la medición",
      error: error.message,
    });
  }
};

const listarComposicion = async (req, res) => {
  try {
    const { id } = req.params;

    const [mediciones] = await db.query(
      `SELECT id, fecha, peso, grasa_corporal_pct, observaciones, creado_en
       FROM composicion_corporal
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    res.json(mediciones);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar la composición corporal",
      error: error.message,
    });
  }
};

const sinExtension = (nombreArchivo) => nombreArchivo.replace(/\.[^/.]+$/, "");

// Videos propios del jugador (distinto de la Biblioteca): cualquier formato,
// sin categoría/rival/resultado ni datos de competencia.
// Admite varios archivos y/o varios links en una sola carga. El título es
// opcional: si se sube más de un video se usa el nombre de archivo (o el link).
const agregarVideoJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, url_video } = req.body;
    const subidoPor = req.usuario.id;

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const videosACrear = [];

    for (const archivo of req.files || []) {
      videosACrear.push({
        titulo: titulo || sinExtension(archivo.originalname),
        tipo: "archivo",
        url_video: await guardarArchivo(archivo.buffer, "videos", archivo.originalname),
      });
    }

    const urls = (Array.isArray(url_video) ? url_video : [url_video])
      .flatMap((valor) => (valor ? valor.split("\n") : []))
      .map((valor) => valor.trim())
      .filter(Boolean);

    urls.forEach((url, i) => {
      videosACrear.push({
        titulo: titulo || (urls.length > 1 ? `Video ${i + 1}` : url),
        tipo: "link",
        url_video: url,
      });
    });

    if (videosACrear.length === 0) {
      return res.status(400).json({
        message: "Subí al menos un archivo o un link de video",
      });
    }

    const idsCreados = [];
    for (const video of videosACrear) {
      const [videoResult] = await db.query(
        `INSERT INTO videos (titulo, descripcion, tipo, url_video, categoria_video, subido_por)
         VALUES (?, ?, ?, ?, 'individual', ?)`,
        [video.titulo, descripcion || null, video.tipo, video.url_video, subidoPor]
      );

      await db.query(
        "INSERT INTO video_jugadores (video_id, jugador_id) VALUES (?, ?)",
        [videoResult.insertId, id]
      );

      idsCreados.push(videoResult.insertId);
    }

    res.status(201).json({
      message: `${idsCreados.length} video(s) agregado(s) correctamente`,
      video_ids: idsCreados,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al agregar los videos",
      error: error.message,
    });
  }
};

const listarVideosJugador = async (req, res) => {
  try {
    const { id } = req.params;

    const [videos] = await db.query(
      `SELECT v.id, v.titulo, v.descripcion, v.tipo, v.url_video, v.fecha_subida
       FROM video_jugadores vj
       JOIN videos v ON v.id = vj.video_id
       WHERE vj.jugador_id = ?
       ORDER BY vj.id DESC`,
      [id]
    );

    res.json(videos);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los videos del jugador",
      error: error.message,
    });
  }
};

module.exports = {
  crearJugador,
  listarJugadores,
  crearCuentaJugador,
  vincularUsuario,
  obtenerJugador,
  actualizarJugador,
  eliminarJugador,
  actualizarAgente,
  actualizarContactoEmergencia,
  actualizarCaracteristicas,
  agregarComposicion,
  listarComposicion,
  agregarVideoJugador,
  listarVideosJugador,
};
