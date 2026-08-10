const db = require("../config/db");
const { generarJSON } = require("../config/gemini");

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

// Los % de las 5 masas (fraccionamiento) y el IMC se calculan siempre a
// partir de los kg cargados y el peso/talla, nunca se cargan a mano.
const calcularCamposDerivados = (evaluacion, fechaNacimientoJugador) => {
  const peso = Number(evaluacion.peso);
  const talla = Number(evaluacion.talla);
  const pct = (kg) => (peso && kg !== null && kg !== undefined ? redondear2((Number(kg) / peso) * 100) : null);

  return {
    ...evaluacion,
    edad_decimal: calcularEdadDecimal(fechaNacimientoJugador, evaluacion.fecha),
    masa_muscular_pct: pct(evaluacion.masa_muscular_kg),
    masa_adiposa_pct: pct(evaluacion.masa_adiposa_kg),
    masa_osea_pct: pct(evaluacion.masa_osea_kg),
    masa_residual_pct: pct(evaluacion.masa_residual_kg),
    masa_piel_pct: pct(evaluacion.masa_piel_kg),
    imc: peso && talla ? redondear2(peso / (talla / 100) ** 2) : null,
  };
};

const CAMPOS_OBLIGATORIOS = [
  "fecha",
  "peso",
  "talla",
  "masa_muscular_kg",
  "masa_adiposa_kg",
  "masa_osea_kg",
  "masa_residual_kg",
  "masa_piel_kg",
  "indice_musculo_oseo",
  "pliegue_triceps",
  "pliegue_subescapular",
  "pliegue_supraespinal",
  "pliegue_abdominal",
  "pliegue_muslo",
  "pliegue_pantorrilla",
];

// Campos antropométricos de registro (básicos extra, diámetros y
// perímetros): opcionales, no alimentan ningún gráfico, solo quedan
// guardados como historial de la medición.
const CAMPOS_ANTROPOMETRIA_OPCIONALES = [
  "talla_sentado_cm",
  "envergadura_cm",
  "altura_pie_cm",
  "diametro_biacromial",
  "diametro_torax_transverso",
  "diametro_torax_anteroposterior",
  "diametro_biiliocrestideo",
  "diametro_humeral",
  "diametro_femoral",
  "perimetro_cabeza",
  "perimetro_brazo_relajado",
  "perimetro_brazo_flexionado",
  "perimetro_antebrazo",
  "perimetro_torax_mesoesternal",
  "perimetro_cintura",
  "perimetro_caderas",
  "perimetro_muslo_superior",
  "perimetro_muslo_medial",
  "perimetro_pantorrilla",
];

const CAMPOS_PLIEGUES = [
  "pliegue_triceps",
  "pliegue_subescapular",
  "pliegue_supraespinal",
  "pliegue_abdominal",
  "pliegue_muslo",
  "pliegue_pantorrilla",
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
      masa_osea_kg,
      masa_residual_kg,
      masa_piel_kg,
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

    // La suma de 6 pliegues nunca se carga a mano: se calcula sumando los
    // 6 pliegues individuales cargados.
    const sumatoriaPliegues = CAMPOS_PLIEGUES.reduce((acc, campo) => acc + Number(req.body[campo]), 0);

    const antropometria = CAMPOS_ANTROPOMETRIA_OPCIONALES.map((campo) => (req.body[campo] === undefined || req.body[campo] === "" ? null : req.body[campo]));
    const pliegues = CAMPOS_PLIEGUES.map((campo) => req.body[campo]);

    const [result] = await db.query(
      `INSERT INTO nutricion_evaluaciones
         (jugador_id, fecha, peso, talla,
          talla_sentado_cm, envergadura_cm, altura_pie_cm,
          diametro_biacromial, diametro_torax_transverso, diametro_torax_anteroposterior,
          diametro_biiliocrestideo, diametro_humeral, diametro_femoral,
          perimetro_cabeza, perimetro_brazo_relajado, perimetro_brazo_flexionado, perimetro_antebrazo,
          perimetro_torax_mesoesternal, perimetro_cintura, perimetro_caderas,
          perimetro_muslo_superior, perimetro_muslo_medial, perimetro_pantorrilla,
          pliegue_triceps, pliegue_subescapular, pliegue_supraespinal, pliegue_abdominal, pliegue_muslo, pliegue_pantorrilla,
          masa_muscular_kg, masa_adiposa_kg, sumatoria_pliegues,
          masa_osea_kg, masa_residual_kg, masa_piel_kg, indice_musculo_oseo, observaciones, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        fecha,
        peso,
        talla,
        ...antropometria,
        ...pliegues,
        masa_muscular_kg,
        masa_adiposa_kg,
        redondear2(sumatoriaPliegues),
        masa_osea_kg,
        masa_residual_kg,
        masa_piel_kg,
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

const CAMPOS_EVALUACION =
  "id, fecha, peso, talla, talla_sentado_cm, envergadura_cm, altura_pie_cm, " +
  "diametro_biacromial, diametro_torax_transverso, diametro_torax_anteroposterior, diametro_biiliocrestideo, diametro_humeral, diametro_femoral, " +
  "perimetro_cabeza, perimetro_brazo_relajado, perimetro_brazo_flexionado, perimetro_antebrazo, perimetro_torax_mesoesternal, perimetro_cintura, " +
  "perimetro_caderas, perimetro_muslo_superior, perimetro_muslo_medial, perimetro_pantorrilla, " +
  "pliegue_triceps, pliegue_subescapular, pliegue_supraespinal, pliegue_abdominal, pliegue_muslo, pliegue_pantorrilla, " +
  "masa_muscular_kg, masa_adiposa_kg, sumatoria_pliegues, masa_osea_kg, masa_residual_kg, masa_piel_kg, indice_musculo_oseo, observaciones, creado_en";

const listarEvaluacionesNutricionales = async (req, res) => {
  try {
    const { id } = req.params;

    const [jugadores] = await db.query("SELECT fecha_nacimiento FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }

    const [evaluaciones] = await db.query(
      `SELECT ${CAMPOS_EVALUACION} FROM nutricion_evaluaciones WHERE jugador_id = ? ORDER BY fecha DESC, id DESC`,
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

// Resumen para la página principal ("Informe nutricional"): la última
// evaluación (con sus campos derivados) + los objetivos configurados para
// la categoría del jugador. No se puede editar nada desde acá.
const obtenerResumenNutricional = async (req, res) => {
  try {
    const { id } = req.params;

    const [jugadores] = await db.query("SELECT fecha_nacimiento, categoria FROM jugadores WHERE id = ?", [id]);
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }
    const { fecha_nacimiento: fechaNacimiento, categoria } = jugadores[0];

    const [evaluaciones] = await db.query(
      `SELECT ${CAMPOS_EVALUACION} FROM nutricion_evaluaciones WHERE jugador_id = ? ORDER BY fecha DESC, id DESC LIMIT 1`,
      [id]
    );
    const ultima = evaluaciones[0] ? calcularCamposDerivados(evaluaciones[0], fechaNacimiento) : null;

    let objetivos = null;
    if (categoria) {
      const [filas] = await db.query("SELECT * FROM objetivos_nutricionales WHERE categoria = ?", [categoria]);
      objetivos = filas[0] || null;
    }

    res.json({ categoria, ultima_evaluacion: ultima, objetivos });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el resumen nutricional",
      error: error.message,
    });
  }
};

// Etiquetas de cada campo para el prompt (mismas que muestra el formulario
// manual en frontend/src/pages/JugadorNutricionEvaluaciones.jsx), para que
// la IA pueda mapear los nombres de la planilla a estos campos.
const ETIQUETAS_CAMPOS = {
  fecha: "Fecha de la evaluación",
  peso: "Peso bruto (kg)",
  talla: "Talla corporal (cm)",
  talla_sentado_cm: "Talla sentado (cm)",
  envergadura_cm: "Envergadura (cm)",
  altura_pie_cm: "Altura en pie (cm)",
  diametro_biacromial: "Diámetro biacromial (cm)",
  diametro_torax_transverso: "Diámetro tórax transverso (cm)",
  diametro_torax_anteroposterior: "Diámetro tórax anteroposterior (cm)",
  diametro_biiliocrestideo: "Diámetro bi-iliocrestídeo (cm)",
  diametro_humeral: "Diámetro humeral, biepicondilar (cm)",
  diametro_femoral: "Diámetro femoral, biepicondilar (cm)",
  perimetro_cabeza: "Perímetro cabeza (cm)",
  perimetro_brazo_relajado: "Perímetro brazo relajado (cm)",
  perimetro_brazo_flexionado: "Perímetro brazo flexionado en tensión (cm)",
  perimetro_antebrazo: "Perímetro antebrazo máximo (cm)",
  perimetro_torax_mesoesternal: "Perímetro tórax mesoesternal (cm)",
  perimetro_cintura: "Perímetro cintura mínima (cm)",
  perimetro_caderas: "Perímetro caderas máximo (cm)",
  perimetro_muslo_superior: "Perímetro muslo máximo (cm)",
  perimetro_muslo_medial: "Perímetro muslo medial (cm)",
  perimetro_pantorrilla: "Perímetro pantorrilla máxima (cm)",
  pliegue_triceps: "Pliegue tríceps (mm)",
  pliegue_subescapular: "Pliegue subescapular (mm)",
  pliegue_supraespinal: "Pliegue supraespinal (mm)",
  pliegue_abdominal: "Pliegue abdominal (mm)",
  pliegue_muslo: "Pliegue muslo medio (mm)",
  pliegue_pantorrilla: "Pliegue pantorrilla (mm)",
  masa_muscular_kg: "Masa muscular (kg)",
  masa_adiposa_kg: "Masa adiposa (kg)",
  masa_osea_kg: "Masa ósea (kg)",
  masa_residual_kg: "Masa residual (kg)",
  masa_piel_kg: "Masa de la piel (kg)",
  indice_musculo_oseo: "Índice músculo-óseo (I/M/O)",
};

const armarPromptEvaluacionPdf = () => {
  const listaCampos = Object.entries(ETIQUETAS_CAMPOS)
    .map(([campo, etiqueta]) => `- "${campo}": ${etiqueta}`)
    .join("\n");

  return [
    "Sos un asistente del departamento de nutrición del Club Atlético Lanús que lee planillas de evaluaciones antropométricas de un jugador (a veces exportadas de Excel a PDF).",
    "Te paso el PDF de la evaluación de UN jugador. Extraé los valores que encuentres para estos campos exactos:",
    listaCampos,
    "",
    "Reglas estrictas:",
    "1. Respondé SOLO JSON válido, sin texto adicional ni fences de markdown, con este schema exacto: un objeto con esas mismas claves, valor numérico si lo encontraste o null si no aparece en el PDF.",
    '2. "fecha" en formato "YYYY-MM-DD" si la encontrás (puede venir como DD/MM/AAAA en la planilla).',
    "3. No inventes ningún valor que no esté en el PDF: si un campo no aparece (por ejemplo las masas corporales o el índice músculo-óseo, que a veces no vienen en esta planilla), dejalo en null.",
    "4. Los valores numéricos van con punto decimal.",
  ].join("\n");
};

// Lee el PDF de una evaluación individual con IA y arma un preview de los
// campos encontrados. NO guarda nada: el cuerpo técnico precarga con esto
// el mismo formulario de carga manual, completa lo que falte y confirma
// con el botón de siempre.
const previsualizarEvaluacionPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Subí el PDF de la evaluación" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "El archivo tiene que ser un PDF" });
    }

    const prompt = armarPromptEvaluacionPdf();
    const resultado = await generarJSON(prompt, { mimeType: "application/pdf", buffer: req.file.buffer });

    const campos = {};
    for (const campo of Object.keys(ETIQUETAS_CAMPOS)) {
      const valor = resultado?.[campo];
      campos[campo] = campo === "fecha" ? (typeof valor === "string" ? valor : null) : typeof valor === "number" ? valor : null;
    }

    res.json({ campos });
  } catch (error) {
    res.status(500).json({
      message: "Error al analizar el PDF con IA",
      error: error.message,
    });
  }
};

module.exports = {
  agregarEvaluacionNutricional,
  listarEvaluacionesNutricionales,
  obtenerResumenNutricional,
  previsualizarEvaluacionPdf,
};
