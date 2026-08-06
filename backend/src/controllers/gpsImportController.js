const db = require("../config/db");
const { generarJSON } = require("../config/gemini");

// Mismo vocabulario de indicadores que la carga manual (ver
// PLANTILLA_INDICADORES en frontend/src/pages/JugadorPreparacionFisica.jsx),
// duplicado acá para armar el prompt: la IA lo usa para mapear sinónimos
// del PDF (ej. "Distance" -> "Distancia total (m)") a este mismo
// vocabulario cuando corresponda, y cae en categoría "Otros" si no matchea.
const PLANTILLA_INDICADORES = [
  { categoria: "Volumen de trabajo", indicadores: ["Distancia total (m)", "Metros/min", "PL por minuto"] },
  {
    categoria: "Alta intensidad",
    indicadores: ["HSR", "Metros 19-24 km/h", "Metros > 24 km/h", "Metros > 30 km/h"],
  },
  {
    categoria: "Explosividad y velocidad",
    indicadores: ["Velocidad máxima (km/h)", "Sprints", "RHIE — total de series"],
  },
  {
    categoria: "Frenos y arranques",
    indicadores: [
      "Aceleraciones Z2+Z3 (esfuerzos)",
      "Desaceleraciones Z2-Z3 (esfuerzos)",
      "Acc/Dec Z2-Z3 (esfuerzos)",
      "Acc/Dec Z2-Z3 (por minuto)",
    ],
  },
];

const armarPrompt = (plantel) => {
  const vocabulario = PLANTILLA_INDICADORES.map(
    ({ categoria, indicadores }) => `- ${categoria}: ${indicadores.join(", ")}`
  ).join("\n");

  const listaPlantel = plantel
    .map((j) => `- id ${j.id}: ${j.nombre} ${j.apellido}${j.posicion ? ` (${j.posicion})` : ""}`)
    .join("\n");

  return [
    "Sos un asistente del cuerpo técnico del Club Atlético Lanús que lee reportes de GPS de entrenamientos y partidos.",
    "Te paso un PDF con los datos de GPS de todo el plantel en una sesión (un jugador por fila o por bloque).",
    "Tu tarea es extraer, para cada jugador que aparezca en el PDF, sus indicadores.",
    "",
    "Plantel del club (usalo para intentar identificar a qué jugador corresponde cada fila del PDF):",
    listaPlantel,
    "",
    "Vocabulario de indicadores ya usado por el club (categoría: indicadores). Si un dato del PDF corresponde a alguno de estos ",
    "(aunque tenga otro nombre o esté en inglés/abreviado), usá exactamente esta categoría e indicador. Si no corresponde a ninguno, ",
    'usá categoria "Otros" y el nombre del indicador tal cual está en el PDF:',
    vocabulario,
    "",
    "Reglas estrictas:",
    "1. Respondé SOLO JSON válido, sin texto adicional ni fences de markdown, con este schema exacto:",
    '   { "filas": [ { "nombre_detectado": string, "jugador_id": number|null, "indicadores": [ { "categoria": string, "indicador": string, "valor": number } ] } ] }',
    "2. \"nombre_detectado\" es el nombre tal cual aparece en el PDF (para que el cuerpo técnico lo pueda comparar).",
    '3. "jugador_id" es el id de la lista del plantel si estás razonablemente segura de la identidad; si tenés dudas, poné null. Nunca inventes un id que no esté en la lista.',
    "4. No inventes valores que no estén en el PDF. Los valores numéricos van con punto decimal.",
    "5. Una fila por jugador detectado en el PDF, aunque no puedas identificarlo (en ese caso jugador_id: null igual).",
  ].join("\n");
};

// Lee el PDF grupal de GPS con IA y arma un preview por jugador. NO guarda
// nada en la base: el cuerpo técnico tiene que revisar/corregir la
// asignación de jugador y confirmar (ver confirmarImportacionGps) antes de
// que se persista cualquier dato.
const previsualizarImportacionGps = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Subí el PDF con los datos de GPS" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "El archivo tiene que ser un PDF" });
    }

    const [plantel] = await db.query("SELECT id, nombre, apellido, posicion FROM jugadores");

    const prompt = armarPrompt(plantel);
    const resultado = await generarJSON(prompt, { mimeType: "application/pdf", buffer: req.file.buffer });

    if (!resultado || !Array.isArray(resultado.filas)) {
      return res.status(502).json({ message: "La IA no devolvió el formato esperado. Probá de nuevo o cargá los datos a mano." });
    }

    const idsValidos = new Set(plantel.map((j) => j.id));
    const filas = resultado.filas.map((f) => ({
      nombre_detectado: String(f.nombre_detectado || "").trim() || "(sin nombre)",
      jugador_id: idsValidos.has(f.jugador_id) ? f.jugador_id : null,
      indicadores: Array.isArray(f.indicadores)
        ? f.indicadores
            .filter((i) => i && i.indicador && typeof i.valor === "number" && !Number.isNaN(i.valor))
            .map((i) => ({ categoria: i.categoria || "Otros", indicador: String(i.indicador), valor: i.valor }))
        : [],
    }));

    res.json({ filas });
  } catch (error) {
    res.status(500).json({
      message: "Error al analizar el PDF con IA",
      error: error.message,
    });
  }
};

// Guarda las filas ya revisadas/confirmadas por el cuerpo técnico: un
// picos_rendimiento por fila, igual que la carga manual (crearPico).
const confirmarImportacionGps = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { fecha, partido, filas } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !partido) {
      return res.status(400).json({ message: "Fecha y partido son obligatorios" });
    }
    if (!Array.isArray(filas) || filas.length === 0) {
      return res.status(400).json({ message: "No hay filas para importar" });
    }

    const filasValidas = filas.filter(
      (f) => f.jugador_id && Array.isArray(f.indicadores) && f.indicadores.length > 0
    );
    if (filasValidas.length === 0) {
      return res.status(400).json({ message: "Ninguna fila tiene jugador asignado e indicadores para importar" });
    }

    await conn.beginTransaction();

    for (const fila of filasValidas) {
      await conn.query(
        `INSERT INTO picos_rendimiento (jugador_id, fecha, partido, indicadores, registrado_por)
         VALUES (?, ?, ?, ?, ?)`,
        [fila.jugador_id, fecha, partido, JSON.stringify(fila.indicadores), registradoPor]
      );
    }

    await conn.commit();

    res.status(201).json({ message: "Importación completada", importados: filasValidas.length });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      message: "Error al confirmar la importación",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

module.exports = { previsualizarImportacionGps, confirmarImportacionGps };
