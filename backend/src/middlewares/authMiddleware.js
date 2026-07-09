const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // El <video> del navegador no puede mandar headers custom, así que para
    // la reproducción de archivos también se acepta el token por query string.
    const token = authHeader ? authHeader.split(" ")[1] : req.query.token;

    if (!token) {
      return res.status(401).json({ message: "Token no enviado" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
      error: error.message,
    });
  }
};

const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        message: "No tenés permisos para realizar esta acción",
      });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  autorizarRoles,
};