const express = require("express");
const router = express.Router();

const {
  previsualizarEstadisticasPartido,
  confirmarEstadisticasPartido,
  listarEstadisticasPartido,
  obtenerEstadisticasPartido,
  obtenerArchivoEstadisticasPartido,
  eliminarEstadisticasPartido,
} = require("../controllers/estadisticasPartidoController");

const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");
const uploadDatos = require("../middlewares/uploadDatosMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Analiza el PDF del informe de partido con IA y devuelve un preview (no
// guarda nada, ver confirmarEstadisticasPartido).
router.post(
  "/analizar-pdf",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDatos.single("archivo"),
  previsualizarEstadisticasPartido
);

// Guarda el partido ya revisado/confirmado por el cuerpo técnico.
router.post(
  "/",
  verificarToken,
  autorizarRoles(...CUERPO_TECNICO),
  uploadDatos.single("archivo"),
  confirmarEstadisticasPartido
);

router.get("/", verificarToken, autorizarRoles(...CUERPO_TECNICO), listarEstadisticasPartido);

router.get("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), obtenerEstadisticasPartido);

// Token también aceptado por query string (ver verificarToken) para poder
// abrir el PDF en una pestaña nueva con un simple link.
router.get("/:id/archivo", verificarToken, obtenerArchivoEstadisticasPartido);

router.delete("/:id", verificarToken, autorizarRoles(...CUERPO_TECNICO), eliminarEstadisticasPartido);

module.exports = router;
