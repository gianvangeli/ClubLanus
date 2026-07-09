
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Registro público: exclusivo para jugadores (acceso solo a la Biblioteca).
// El rol se fuerza a "jugador" y no se acepta desde el body para evitar
// que alguien se autoasigne un rol de cuerpo técnico.
const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const [existentes] = await db.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (existentes.length > 0) {
      return res.status(409).json({ message: "Ya existe una cuenta con ese email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'jugador')",
      [nombre, email, hashedPassword]
    );

    res.status(201).json({
      message: "Cuenta creada correctamente",
      usuario_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar usuario",
      error: error.message,
    });
  }
};

// Alta de cuerpo técnico: solo un admin puede crear cuentas con rol
// admin / entrenador / preparador_fisico.
const registrarStaff = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const rolesValidos = ["admin", "entrenador", "preparador_fisico"];

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    const [existentes] = await db.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (existentes.length > 0) {
      return res.status(409).json({ message: "Ya existe una cuenta con ese email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
      [nombre, email, hashedPassword, rol]
    );

    res.status(201).json({
      message: "Miembro del cuerpo técnico creado correctamente",
      usuario_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar miembro del cuerpo técnico",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const usuario = usuarios[0];

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login correcto",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  registrarStaff,
  login,
};