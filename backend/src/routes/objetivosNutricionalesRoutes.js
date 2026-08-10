const express = require("express");
const router = express.Router();

const {
  listarObjetivos,
  guardarObjetivo,
  eliminarObjetivo,
  obtenerReporteGrupalNutricion,
} = require("../controllers/objetivosNutricionalesController");
const { verificarToken, autorizarRoles } = require("../middlewares/authMiddleware");

const CUERPO_TECNICO = ["admin", "entrenador", "preparador_fisico"];

// Configuración exclusiva de cuerpo técnico/admin: define los objetivos
// nutricionales de cada categoría (suma de 6 pliegues, índice M.O.).
router.use(verificarToken, autorizarRoles(...CUERPO_TECNICO));

router.get("/", listarObjetivos);
router.put("/", guardarObjetivo);
router.delete("/:id", eliminarObjetivo);

// Reporte grupal automático: Peso/Suma 6 pliegues/IMO de todo el plantel de
// una categoría, agrupado por período, a partir de las evaluaciones ya
// cargadas (no sube nada nuevo).
router.get("/reporte-grupal", obtenerReporteGrupalNutricion);

module.exports = router;
