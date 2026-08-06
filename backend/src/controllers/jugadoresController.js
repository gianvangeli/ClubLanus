const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../config/db");

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

// La edad nunca se carga a mano: se calcula siempre a partir de la fecha de
// nacimiento, tanto en el listado como en la ficha individual.
const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;

  const fecha = new Date(fechaNacimiento);
  if (Number.isNaN(fecha.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getUTCFullYear();
  const diffMes = hoy.getMonth() - fecha.getUTCMonth();
  if (diffMes < 0 || (diffMes === 0 && hoy.getDate() < fecha.getUTCDate())) {
    edad--;
  }

  return edad;
};

// Alta de jugador (ficha del cuerpo técnico): nombre, apellido, fecha de
// nacimiento, altura. El peso no se carga acá: se registra desde la ficha
// del jugador como una medición de composición corporal (peso + % grasa
// corporal). No requiere una cuenta de usuario todavía: se crea después con
// crearCuentaJugador, pidiéndole el mail al jugador.
const crearJugador = async (req, res) => {
  try {
    const { nombre, apellido, fecha_nacimiento, altura, usuario_id } = req.body;

    if (!nombre || !apellido) {
      return res.status(400).json({ message: "Nombre y apellido son obligatorios" });
    }

    const [result] = await db.query(
      `INSERT INTO jugadores (usuario_id, nombre, apellido, fecha_nacimiento, altura)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id || null, nombre, apellido, fecha_nacimiento || null, altura || null]
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
      `SELECT id, usuario_id, nombre, apellido, fecha_nacimiento, peso, altura, posicion, categoria, division_nombre, creado_en
       FROM jugadores
       ORDER BY apellido, nombre`
    );

    res.json(jugadores.map((j) => ({ ...j, edad: calcularEdad(j.fecha_nacimiento) })));
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

// Crea la cuenta del psicólogo asignado al jugador (rol 'psicologo') y la
// vincula. Es la única cuenta con acceso a los informes psicológicos del
// jugador: ni el cuerpo técnico ni la dirigencia pueden verlos, por eso acá
// se pide el nombre del psicólogo (no es el jugador quien se loguea).
const crearCuentaPsicologo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ message: "Faltan el nombre y el mail del psicólogo" });
    }

    const [jugadores] = await db.query("SELECT id, psicologo_id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }
    if (jugadores[0].psicologo_id) {
      return res.status(409).json({ message: "Este jugador ya tiene un psicólogo asignado" });
    }

    const [existentes] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existentes.length > 0) {
      return res.status(409).json({ message: "Ya existe una cuenta con ese mail" });
    }

    const passwordProvisoria = crypto.randomBytes(6).toString("base64url");
    const hashedPassword = await bcrypt.hash(passwordProvisoria, 10);

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'psicologo')",
      [nombre, email, hashedPassword]
    );

    await db.query("UPDATE jugadores SET psicologo_id = ? WHERE id = ?", [result.insertId, id]);

    res.status(201).json({
      message: "Cuenta de psicólogo creada y vinculada correctamente",
      email,
      password: passwordProvisoria,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear la cuenta del psicólogo",
      error: error.message,
    });
  }
};

// Vincula al jugador con una cuenta de psicólogo ya existente (para cuando
// el mismo psicólogo atiende a más de un jugador del plantel)
const vincularPsicologo = async (req, res) => {
  try {
    const jugadorId = req.params.id;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: "Falta usuario_id" });
    }

    const [usuarios] = await db.query(
      "SELECT id FROM usuarios WHERE id = ? AND rol = 'psicologo'",
      [usuario_id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: "No existe un usuario psicólogo con ese id" });
    }

    await db.query("UPDATE jugadores SET psicologo_id = ? WHERE id = ?", [
      usuario_id,
      jugadorId,
    ]);

    res.json({
      message: "Psicólogo vinculado correctamente",
      jugador_id: Number(jugadorId),
      usuario_id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al vincular el psicólogo",
      error: error.message,
    });
  }
};

// Ficha completa de un jugador: datos + última medición de composición corporal
const obtenerJugador = async (req, res) => {
  try {
    const { id } = req.params;

    const [jugadores] = await db.query(
      `SELECT j.id, j.usuario_id, j.nombre, j.apellido, j.fecha_nacimiento, j.peso, j.altura, j.nacionalidad_1, j.nacionalidad_2, j.nacionalidad_2_tramite, j.posicion, j.categoria, j.division_nombre,
              j.contrato, j.agente_nombre, j.agente_apellido, j.agente_mail, j.agente_telefono,
              j.contacto_emergencia_nombre, j.contacto_emergencia_apellido, j.contacto_emergencia_relacion, j.contacto_emergencia_telefono,
              j.pie, j.posiciones_cancha, j.partidos_jugados, j.psicologo_id,
              j.semaforo_psicologico, j.semaforo_analisis,
              j.creado_en, u.email AS usuario_email, p.email AS psicologo_email
       FROM jugadores j
       LEFT JOIN usuarios u ON u.id = j.usuario_id
       LEFT JOIN usuarios p ON p.id = j.psicologo_id
       WHERE j.id = ?`,
      [id]
    );

    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const jugador = jugadores[0];
    jugador.posiciones_cancha = jugador.posiciones_cancha ? JSON.parse(jugador.posiciones_cancha) : [];
    jugador.edad = calcularEdad(jugador.fecha_nacimiento);

    res.json(jugador);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el jugador",
      error: error.message,
    });
  }
};

// Edita los datos de la ficha. El peso se carga aparte (vía composición
// corporal) y posición/división ya no se editan acá: posición vive en
// Características (posiciones_cancha) y división quedó fuera de la ficha.
const actualizarJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      fecha_nacimiento,
      altura,
      nacionalidad_1,
      nacionalidad_2,
      nacionalidad_2_tramite,
      categoria,
      contrato,
    } = req.body;

    if (!nombre || !apellido) {
      return res.status(400).json({ message: "Nombre y apellido son obligatorios" });
    }

    if (contrato && !["si", "no"].includes(contrato)) {
      return res.status(400).json({ message: "Contrato tiene que ser 'si' o 'no'" });
    }

    if (nacionalidad_2_tramite && !["en_curso", "finalizado"].includes(nacionalidad_2_tramite)) {
      return res.status(400).json({ message: "El trámite de la segunda nacionalidad tiene que ser 'en_curso' o 'finalizado'" });
    }

    const [result] = await db.query(
      `UPDATE jugadores
       SET nombre = ?, apellido = ?, fecha_nacimiento = ?, altura = ?, nacionalidad_1 = ?, nacionalidad_2 = ?,
           nacionalidad_2_tramite = ?, categoria = ?, contrato = ?
       WHERE id = ?`,
      [
        nombre,
        apellido,
        fecha_nacimiento || null,
        altura || null,
        nacionalidad_1 || null,
        nacionalidad_2 || null,
        nacionalidad_2_tramite || null,
        categoria || null,
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
// corporal y las tablas legadas con FK hacia jugadores.
const eliminarJugador = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    const [jugadores] = await conn.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    await conn.beginTransaction();

    await conn.query("DELETE FROM composicion_corporal WHERE jugador_id = ?", [id]);
    await conn.query("DELETE FROM entrenamiento_jugadores WHERE jugador_id = ?", [id]);
    await conn.query("DELETE FROM informes WHERE jugador_id = ?", [id]);

    await conn.query("DELETE FROM jugadores WHERE id = ?", [id]);

    await conn.commit();

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

// Carga/edita las características del jugador: pie hábil y sectores de la
// cancha que ocupa (uno o más). Partidos jugados no corresponde a este
// apartado y ya no se edita acá.
const actualizarCaracteristicas = async (req, res) => {
  try {
    const { id } = req.params;
    const { pie } = req.body;
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
       SET pie = ?, posiciones_cancha = ?
       WHERE id = ?`,
      [
        pie || null,
        posicionesCancha.length > 0 ? JSON.stringify(posicionesCancha) : null,
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

module.exports = {
  crearJugador,
  listarJugadores,
  crearCuentaJugador,
  vincularUsuario,
  crearCuentaPsicologo,
  vincularPsicologo,
  obtenerJugador,
  actualizarJugador,
  eliminarJugador,
  actualizarAgente,
  actualizarContactoEmergencia,
  actualizarCaracteristicas,
  agregarComposicion,
  listarComposicion,
};
