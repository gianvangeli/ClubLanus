const db = require("../config/db");

const redondear2 = (n) => Math.round(n * 100) / 100;

// Edad decimal a la fecha de la evaluación (nunca se carga a mano, se
// deriva de jugadores.fecha_nacimiento), usando 365.25 días/año.
const calcularEdadDecimal = (fechaNacimiento, fechaReferencia) => {
  if (!fechaNacimiento || !fechaReferencia) return null;

  const nacimiento = new Date(fechaNacimiento);
  const referencia = new Date(fechaReferencia);
  if (Number.isNaN(nacimiento.getTime()) || Number.isNaN(referencia.getTime())) return null;

  const msPorDia = 24 * 60 * 60 * 1000;
  const diasNacimiento = Date.UTC(nacimiento.getUTCFullYear(), nacimiento.getUTCMonth(), nacimiento.getUTCDate());
  const diasReferencia = Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), referencia.getUTCDate());

  return redondear2((diasReferencia - diasNacimiento) / msPorDia / 365.25);
};

// Masa muscular %, masa adiposa % e IMC se calculan siempre a partir de los
// valores cargados (kg/peso y peso/talla²), nunca se cargan a mano.
const calcularCamposDerivados = (evaluacion, fechaNacimientoJugador) => {
  const peso = Number(evaluacion.peso);
  const talla = Number(evaluacion.talla);
  const masaMuscularKg = Number(evaluacion.masa_muscular_kg);
  const masaAdiposaKg = Number(evaluacion.masa_adiposa_kg);

  return {
    ...evaluacion,
    edad_decimal: calcularEdadDecimal(fechaNacimientoJugador, evaluacion.fecha),
    masa_muscular_pct: peso ? redondear2((masaMuscularKg / peso) * 100) : null,
    masa_adiposa_pct: peso ? redondear2((masaAdiposaKg / peso) * 100) : null,
    imc: peso && talla ? redondear2(peso / (talla / 100) ** 2) : null,
  };
};

const CAMPOS_OBLIGATORIOS = [
  "fecha",
  "peso",
  "talla",
  "masa_muscular_kg",
  "masa_adiposa_kg",
  "sumatoria_pliegues",
  "masa_osea",
  "indice_musculo_oseo",
];

// Registra una nueva evaluación nutricional. Cada carga es un registro
// nuevo e independiente: nunca se edita ni se sobrescribe una evaluación
// anterior, así se puede reconstruir la evolución completa del jugador.
const agregarEvaluacionNutricional = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha,
      peso,
      talla,
      masa_muscular_kg,
      masa_adiposa_kg,
      sumatoria_pliegues,
      masa_osea,
      indice_musculo_oseo,
      observaciones,
    } = req.body;
    const registradoPor = req.usuario.id;

    const faltante = CAMPOS_OBLIGATORIOS.find((campo) => req.body[campo] === undefined || req.body[campo] === null || req.body[campo] === "");
    if (faltante) {
      return res.status(400).json({ message: "Faltan datos obligatorios de la evaluación nutricional" });
    }

    const [jugadores] = await db.query("SELECT id FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [result] = await db.query(
      `INSERT INTO nutricion_evaluaciones
         (jugador_id, fecha, peso, talla, masa_muscular_kg, masa_adiposa_kg, sumatoria_pliegues, masa_osea, indice_musculo_oseo, observaciones, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        fecha,
        peso,
        talla,
        masa_muscular_kg,
        masa_adiposa_kg,
        sumatoria_pliegues,
        masa_osea,
        indice_musculo_oseo,
        observaciones || null,
        registradoPor,
      ]
    );

    res.status(201).json({
      message: "Evaluación nutricional registrada correctamente",
      evaluacion_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar la evaluación nutricional",
      error: error.message,
    });
  }
};

const listarEvaluacionesNutricionales = async (req, res) => {
  try {
    const { id } = req.params;

    const [jugadores] = await db.query("SELECT fecha_nacimiento FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [evaluaciones] = await db.query(
      `SELECT id, fecha, peso, talla, masa_muscular_kg, masa_adiposa_kg, sumatoria_pliegues, masa_osea, indice_musculo_oseo, observaciones, creado_en
       FROM nutricion_evaluaciones
       WHERE jugador_id = ?
       ORDER BY fecha DESC, id DESC`,
      [id]
    );

    const fechaNacimiento = jugadores[0].fecha_nacimiento;
    res.json(evaluaciones.map((evaluacion) => calcularCamposDerivados(evaluacion, fechaNacimiento)));
  } catch (error) {
    res.status(500).json({
      message: "Error al listar las evaluaciones nutricionales",
      error: error.message,
    });
  }
};

module.exports = {
  agregarEvaluacionNutricional,
  listarEvaluacionesNutricionales,
};
