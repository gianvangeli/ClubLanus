const db = require("../config/db");

// Alta de jugador (ficha del cuerpo técnico): nombre, apellido, edad, altura.
// El peso no se carga acá: se registra desde la ficha del jugador como una
// medición de composición corporal (peso + % grasa corporal).
// No requiere una cuenta de usuario todavía: se puede vincular después con
// vincularUsuario cuando el jugador se registre por su cuenta en /api/auth/register.
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

// Vincula una ficha de jugador con su cuenta de usuario (creada vía /api/auth/register)
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
      `SELECT id, usuario_id, nombre, apellido, edad, peso, altura, posicion, categoria, division_nombre, creado_en
       FROM jugadores WHERE id = ?`,
      [id]
    );

    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    res.json(jugadores[0]);
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
    const { nombre, apellido, edad, altura, posicion, categoria, division_nombre } = req.body;

    if (!nombre || !apellido) {
      return res.status(400).json({ message: "Nombre y apellido son obligatorios" });
    }

    const [result] = await db.query(
      `UPDATE jugadores
       SET nombre = ?, apellido = ?, edad = ?, altura = ?, posicion = ?, categoria = ?, division_nombre = ?
       WHERE id = ?`,
      [
        nombre,
        apellido,
        edad || null,
        altura || null,
        posicion || null,
        categoria || null,
        division_nombre || null,
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
        url_video: `/uploads/videos/${archivo.filename}`,
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
  vincularUsuario,
  obtenerJugador,
  actualizarJugador,
  agregarComposicion,
  listarComposicion,
  agregarVideoJugador,
  listarVideosJugador,
};
