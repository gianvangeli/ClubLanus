const express = require("express");
const router = express.Router();

const { listarObjetivos, guardarObjetivo, eliminarObjetivo } = require("../controllers/objetivosNutricionalesController");
const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Configuración exclusiva de cuerpo técnico/admin: define los objetivos
// nutricionales de cada categoría (peso, suma de 6 pliegues, índice M.O.,
// IMC de referencia).
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

router.get("/", listarObjetivos);
router.put("/", guardarObjetivo);
router.delete("/:id", eliminarObjetivo);

module.exports = router;
