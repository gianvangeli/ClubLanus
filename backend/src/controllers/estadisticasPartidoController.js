const db = require("../config/db");
const { generarJSON } = require("../config/gemini");
const { guardarArchivo, servirArchivo, eliminarArchivo } = require("../config/storage");

// Vocabulario de indicadores de EQUIPO, agrupado en las 12 categorías del
// informe (formato Wyscout). Es una comparativa Lanús vs rival, no una
// medición individual: cada indicador lleva valor_lanus y valor_rival.
const CATEGORIAS_EQUIPO = [
  {
    categoria: "General",
    indicadores: [
      "Goles", "xG", "Tiros", "Tiros a la portería", "Del área de penalti a la portería",
      "Fuera del área a la portería", "Distancia media tiro (m)", "Córneres", "Tiros libres",
      "Fuera de juego", "Faltas", "Faltas recibidas", "Tarjetas amarillas", "Tarjetas rojas",
    ],
  },
  {
    categoria: "Acciones ofensivas",
    indicadores: [
      "Total de acciones ofensivas", "Acciones ofensivas con remate", "Posicionamiento ofensivo",
      "Posicionamiento ofensivo con remate", "Contraataques", "Tiros libres con remate",
      "Córneres con remate",
    ],
  },
  {
    categoria: "Fase defensiva",
    indicadores: [
      "Entradas a ras de suelo", "Entradas a ras de suelo logradas", "Interceptaciones",
      "Salidas del arquero", "Pases concedidos por acción defensiva", "PPDA",
    ],
  },
  {
    categoria: "Transiciones",
    indicadores: [
      "Transiciones", "Balones recuperados", "Balones recuperados bajos", "Balones recuperados medios",
      "Balones recuperados altos", "Recuperación de balón en mitad adversaria", "Balones perdidos",
      "Balones perdidos bajos", "Balones perdidos medios", "Balones perdidos altos",
    ],
  },
  {
    categoria: "Duelos",
    indicadores: [
      "Duelos totales", "Duelos totales ganados", "Duelos ofensivos", "Duelos ofensivos ganados",
      "Duelos defensivos", "Duelos defensivos ganados", "Duelos por balón perdido",
      "Duelos por balón perdido ganados", "Duelos aéreos", "Duelos aéreos ganados", "Intensidad duelo",
    ],
  },
  { categoria: "Regates", indicadores: ["Regates", "Regates logrados"] },
  {
    categoria: "Posesión",
    indicadores: [
      "Posesión del balón (%)", "Tiempo efectivo de posesión", "Número de posesiones",
      "Posesión que alcanza la mitad adversaria", "Posesión que alcanza el área pequeña",
      "Duración media de posesión", "Tiempo muerto", "Posesión en movimiento",
      "Posesión breve (0-10 seg)", "Posesión media (10-20 seg)", "Posesión larga (20-45 seg)",
      "Posesión muy larga (45+ seg)",
    ],
  },
  {
    categoria: "Pases",
    indicadores: [
      "Pases totales", "Pases totales precisos", "Pases hacia adelante", "Pases hacia adelante logrados",
      "Pases hacia atrás", "Pases hacia atrás logrados", "Pases laterales", "Pases laterales logrados",
      "Pases progresivos", "Pases progresivos precisos", "Pases largos", "Pases largos logrados",
      "Pases en el último tercio", "Pases en el último tercio logrados",
      "Longitud media pases en el último tercio (m)", "Longitud media pases (m)",
    ],
  },
  {
    categoria: "Centros",
    indicadores: [
      "Centros al área", "Centros al área logrados", "Centros", "Centros precisos", "Centros bajos",
      "Centros medios", "Centros altos", "Pases en profundidad", "Pases en profundidad logrados",
    ],
  },
  { categoria: "Desmarques", indicadores: ["Desmarques", "Desmarques logrados"] },
  { categoria: "Ataques en profundidad", indicadores: ["Ataques en profundidad"] },
  { categoria: "Intensidad de juego", indicadores: ["Intensidad de juego"] },
];

// Vocabulario de indicadores POR JUGADOR (solo plantel propio), en 4
// bloques según el informe real: generales, duelos, organización (pases) y
// arquero (este último solo aplica al jugador que jugó de arquero).
const BLOQUES_JUGADOR = [
  {
    categoria: "Generales",
    indicadores: [
      "Minutos jugados", "Goles", "xG", "Asistencias", "xA", "Acciones logradas", "Tiros a la portería",
      "Pases", "Pases precisos", "Centros", "Centros precisos", "Regates", "Regates logrados", "Duelos",
      "Duelos ganados", "Balones perdidos (propia mitad)", "Balones recuperados (mitad adv.)",
      "Toques en el área de penalti", "Fuera de juego", "Tarjetas amarillas", "Tarjetas rojas",
    ],
  },
  {
    categoria: "Duelos",
    indicadores: [
      "Minutos jugados", "Duelos defensivos", "Duelos defensivos ganados", "Duelos ofensivos",
      "Duelos ofensivos ganados", "Duelos aéreos", "Duelos aéreos ganados", "Duelos por balón perdido",
      "Duelos por balón ganados", "Tiros interceptados", "Interceptaciones", "Despejes",
      "Entradas a ras de suelo", "Entradas a ras de suelo logradas", "Faltas", "Faltas recibidas",
      "Tiros libres", "Tiros libres directos", "Córner en contra", "Saques laterales",
    ],
  },
  {
    categoria: "Organización (pases)",
    indicadores: [
      "Minutos jugados", "Pases hacia adelante", "Pases hacia adelante precisos", "Pases hacia atrás",
      "Pases hacia atrás precisos", "Pases laterales", "Pases laterales precisos",
      "Pases cortos+medios", "Pases cortos+medios precisos", "Pases largos", "Pases largos precisos",
      "Pases progresivos", "Pases progresivos precisos", "Pases al último tercio",
      "Pases al último tercio logrados", "Pases a través", "Pases a través precisos",
      "Ataque en profundidad", "Pases clave", "Segunda asistencia", "Tercera asistencia",
      "Asistencias a tiro", "Longitud media de pases",
    ],
  },
  {
    categoria: "Arquero",
    indicadores: [
      "Pases", "Pases logrados", "Pases fuera del primer tercio", "Pases fuera del primer tercio logrados",
      "Cesión al arquero", "Tiros en contra", "Goles recibidos", "Paradas", "Paradas de reflejo",
      "Goles de penaltis concedidos", "Goles de penaltis parados", "Duelos aéreos", "Duelos aéreos ganados",
      "Salidas",
    ],
  },
];

// Glosario oficial del informe (última página del PDF), usado como contexto
// para que la IA desambigüe términos abreviados o poco obvios.
const GLOSARIO = [
  ["Posición media", "Las posiciones de los jugadores son calculadas sobre la base de la posición media de todas las acciones donde se tocó el balón."],
  ["XG (Expected Goals)", "Métrica que asigna a todos los disparos una probabilidad de gol sobre la base de datos estadísticos históricos (posición en el campo, tipo de asistencia, etc.)."],
  ["Pase hacia adelante / hacia atrás / lateral", "Los pases se cuantifican en cuadrantes de 45°. Los pases que superan 12 metros de longitud se consideran laterales."],
  ["Desmarque", "Pase que desarrolla una acción ofensiva de una manera creativa."],
  ["Second / Third assist", "El 'Second assist' es el pase anterior al pase de gol. El 'Third assist' es el pase que precede al second assist."],
  ["Pase progresivo", "Pase que mueve significativamente el balón hacia adelante: mínimo 30m si inicio/fin están en la propia mitad, 15m si están en la otra mitad, 10m si están en la mitad adversaria."],
  ["Pase hacia el último tercio", "Pase hacia una zona dentro de 35 metros desde la línea de fondo."],
  ["Duelo defensivo", "Duelo que ocurre cuando el equipo adversario está en posesión de balón."],
  ["Duelo ofensivo", "Duelo ocurrido cuando el jugador estaba en posesión de balón."],
  ["Parada de reflejo", "Parada de reflejo del arquero."],
  ["Transición", "Momento de articulación del juego entre el momento ofensivo (se gana el balón) y el defensivo (se pierde el balón), y viceversa."],
  ["Ataque", "Posesión de balón que incluye al menos una jugada en el último tercio del campo adversario."],
  ["Contraataque", "Principio táctico ofensivo en donde el equipo que ataca roba el balón y rápidamente se dirige hacia la portería para sorprender al rival desorganizado en defensa."],
  ["Posicionamiento ofensivo", "Cualquier acción ofensiva (que no sea desde una jugada a balón parado) que no se considera un contraataque."],
  ["Ataque en profundidad", "Pase (excepto los centros) recibido en un radio de 20 metros desde la línea de fondo."],
  ["PPDA", "Métrica que permite detectar la intensidad de pressing en el espacio más allá de los primeros 40 metros del campo del equipo atacante."],
  ["Intensidad de juego", "Número de pases por minuto de posesión del balón."],
];

const armarPromptEstadisticas = (plantel) => {
  const vocabularioEquipo = CATEGORIAS_EQUIPO.map(
    ({ categoria, indicadores }) => `- ${categoria}: ${indicadores.join(", ")}`
  ).join("\n");

  const vocabularioJugador = BLOQUES_JUGADOR.map(
    ({ categoria, indicadores }) => `- ${categoria}: ${indicadores.join(", ")}`
  ).join("\n");

  const glosario = GLOSARIO.map(([termino, definicion]) => `- ${termino}: ${definicion}`).join("\n");

  const listaPlantel = plantel
    .map((j) => `- id ${j.id}: ${j.nombre} ${j.apellido}${j.posicion ? ` (${j.posicion})` : ""}`)
    .join("\n");

  return [
    "Sos un asistente del cuerpo técnico del Club Atlético Lanús que lee informes de partido en formato Wyscout (PDF).",
    "El informe tiene una comparativa de estadísticas de EQUIPO (Club Atlético Lanús vs el rival) y tablas de estadísticas por JUGADOR de ambos planteles.",
    "",
    "Plantel del Club Atlético Lanús (usalo para identificar a qué jugador corresponde cada fila del PDF, Y para determinar cuál de los dos equipos del informe es Lanús — puede figurar como 'Lanús', 'CA Lanús', 'Lanús Res.' u otra variante):",
    listaPlantel,
    "",
    "Vocabulario de indicadores de EQUIPO ya usado por el club (categoría: indicadores). El informe puede traer hasta ~50 métricas repartidas en estas categorías: extraé todas las que encuentres, comparando Lanús vs el rival. Si un dato del PDF corresponde a alguno de estos (aunque tenga otro nombre, esté abreviado o en inglés), usá exactamente esta categoría e indicador. Si no corresponde a ninguno, usá categoría \"Otros\":",
    vocabularioEquipo,
    "",
    "Vocabulario de indicadores POR JUGADOR ya usado por el club (categoría: indicadores). Mismo criterio de matching que arriba, categoría \"Otros\" si no corresponde a ninguno. El bloque \"Arquero\" solo aplica al jugador que jugó de arquero en este partido (identificable por la sección \"Estadísticas arquero\" del informe):",
    vocabularioJugador,
    "",
    "Glosario oficial del informe, usalo para interpretar correctamente términos abreviados o poco obvios (PPDA, xG, second/third assist, etc.):",
    glosario,
    "",
    "Reglas estrictas:",
    "1. Respondé SOLO JSON válido, sin texto adicional ni fences de markdown, con este schema exacto:",
    '   { "partido": { "rival": string, "condicion": "local"|"visitante"|null, "resultado": string|null, "competencia": string|null }, "equipo": [ { "categoria": string, "indicador": string, "valor_lanus": number|null, "valor_rival": number|null } ], "jugadores": [ { "nombre_detectado": string, "jugador_id": number|null, "indicadores": [ { "categoria": string, "indicador": string, "valor": number } ] } ] }',
    '2. "jugadores" incluye SOLO jugadores del plantel propio (Lanús), nunca del equipo rival. Una fila por jugador de Lanús detectado en el informe, aunque no puedas identificarlo con certeza (en ese caso jugador_id: null igual, y nombre_detectado con el nombre tal cual aparece en el PDF).',
    '3. "jugador_id" es el id de la lista del plantel si estás razonablemente segura de la identidad; si tenés dudas, poné null. Nunca inventes un id que no esté en la lista.',
    "4. Muchos valores del PDF vienen compuestos (ej. \"5/1 20%\" = intentos/logrados/porcentaje, o 4 números juntos como desglose en subtipos). Desdoblalos en varios indicadores numéricos separados usando los encabezados de columna reales del PDF (ej. \"Pases\" y \"Pases precisos\" como dos indicadores, no uno con el texto \"5/1 20%\"). Nunca guardes un valor como string.",
    "5. No inventes valores que no estén en el PDF: en \"equipo\" usá null en valor_lanus/valor_rival si ese dato no aparece para ese lado; en indicadores de jugador, directamente omitilo si no aparece.",
    "6. Los valores numéricos van con punto decimal.",
  ].join("\n");
};

// Lee el PDF del informe de partido con IA y arma un preview (equipo +
// jugadores). NO guarda nada en la base: el cuerpo técnico tiene que
// revisar/corregir antes de confirmar (ver confirmarEstadisticasPartido).
const previsualizarEstadisticasPartido = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Subí el PDF del informe de partido" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "El archivo tiene que ser un PDF" });
    }

    const [plantel] = await db.query("SELECT id, nombre, apellido, posicion FROM jugadores");

    const prompt = armarPromptEstadisticas(plantel);
    const resultado = await generarJSON(prompt, { mimeType: "application/pdf", buffer: req.file.buffer });

    if (!resultado || !Array.isArray(resultado.equipo) || !Array.isArray(resultado.jugadores)) {
      return res.status(502).json({ message: "La IA no devolvió el formato esperado. Probá de nuevo o cargá los datos a mano." });
    }

    const equipo = resultado.equipo
      .filter((i) => i && i.indicador && (typeof i.valor_lanus === "number" || typeof i.valor_rival === "number"))
      .map((i) => ({
        categoria: i.categoria || "Otros",
        indicador: String(i.indicador),
        valor_lanus: typeof i.valor_lanus === "number" && !Number.isNaN(i.valor_lanus) ? i.valor_lanus : null,
        valor_rival: typeof i.valor_rival === "number" && !Number.isNaN(i.valor_rival) ? i.valor_rival : null,
      }));

    const idsValidos = new Set(plantel.map((j) => j.id));
    const jugadores = resultado.jugadores.map((f) => ({
      nombre_detectado: String(f.nombre_detectado || "").trim() || "(sin nombre)",
      jugador_id: idsValidos.has(f.jugador_id) ? f.jugador_id : null,
      indicadores: Array.isArray(f.indicadores)
        ? f.indicadores
            .filter((i) => i && i.indicador && typeof i.valor === "number" && !Number.isNaN(i.valor))
            .map((i) => ({ categoria: i.categoria || "Otros", indicador: String(i.indicador), valor: i.valor }))
        : [],
    }));

    const partido = resultado.partido || {};

    res.json({
      partido: {
        rival: String(partido.rival || "").trim(),
        condicion: ["local", "visitante"].includes(partido.condicion) ? partido.condicion : null,
        resultado: partido.resultado ? String(partido.resultado) : null,
        competencia: partido.competencia ? String(partido.competencia) : null,
      },
      equipo,
      jugadores,
    });
  } catch (error) {
    console.error("Error al previsualizar estadísticas de partido:", error);
    res.status(500).json({
      message: "Error al analizar el PDF con IA",
      error: error.message,
    });
  }
};

// Guarda el partido ya revisado/confirmado por el cuerpo técnico: la
// cabecera + estadísticas de equipo en estadisticas_partido, y una fila por
// jugador en estadisticas_partido_jugadores. Reutiliza el mismo PDF que se
// analizó (el frontend lo retiene en el estado desde el paso anterior).
const confirmarEstadisticasPartido = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { fecha, rival, condicion, resultado, competencia } = req.body;
    const registradoPor = req.usuario.id;

    if (!fecha || !rival) {
      return res.status(400).json({ message: "Fecha y rival son obligatorios" });
    }
    if (condicion && !["local", "visitante"].includes(condicion)) {
      return res.status(400).json({ message: "Condición inválida" });
    }

    let equipo;
    let jugadores;
    try {
      equipo = JSON.parse(req.body.equipo || "[]");
      jugadores = JSON.parse(req.body.jugadores || "[]");
    } catch {
      return res.status(400).json({ message: "Los datos de equipo/jugadores no son JSON válido" });
    }

    if (!Array.isArray(equipo) || !Array.isArray(jugadores) || equipo.length === 0) {
      return res.status(400).json({ message: "No hay estadísticas de equipo para importar" });
    }

    const jugadoresValidos = jugadores.filter(
      (f) => f.jugador_id && Array.isArray(f.indicadores) && f.indicadores.length > 0
    );

    let archivo = null;
    let nombreArchivo = null;
    if (req.file) {
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "El archivo tiene que ser un PDF" });
      }
      archivo = await guardarArchivo(req.file.buffer, "estadisticas-partido", req.file.originalname);
      nombreArchivo = req.file.originalname;
    }

    await conn.beginTransaction();

    const [resultadoInsert] = await conn.query(
      `INSERT INTO estadisticas_partido (fecha, rival, condicion, resultado, competencia, equipo_indicadores, archivo, nombre_archivo, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha, rival, condicion || null, resultado || null, competencia || null, JSON.stringify(equipo), archivo, nombreArchivo, registradoPor]
    );
    const partidoId = resultadoInsert.insertId;

    for (const fila of jugadoresValidos) {
      await conn.query(
        `INSERT INTO estadisticas_partido_jugadores (partido_id, jugador_id, indicadores) VALUES (?, ?, ?)`,
        [partidoId, fila.jugador_id, JSON.stringify(fila.indicadores)]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: "Partido importado correctamente",
      partido_id: partidoId,
      jugadores_importados: jugadoresValidos.length,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error al confirmar estadísticas de partido:", error);
    res.status(500).json({
      message: "Error al guardar el partido",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

const listarEstadisticasPartido = async (req, res) => {
  try {
    const [partidos] = await db.query(
      `SELECT id, fecha, rival, condicion, resultado, competencia, nombre_archivo, creado_en
       FROM estadisticas_partido ORDER BY fecha DESC, id DESC`
    );
    res.json(partidos);
  } catch (error) {
    res.status(500).json({ message: "Error al listar los partidos", error: error.message });
  }
};

const obtenerEstadisticasPartido = async (req, res) => {
  try {
    const { id } = req.params;

    const [partidos] = await db.query("SELECT * FROM estadisticas_partido WHERE id = ?", [id]);
    if (partidos.length === 0) {
      return res.status(404).json({ message: "Partido no encontrado" });
    }
    const partido = partidos[0];

    const [filasJugadores] = await db.query(
      `SELECT epj.id, epj.jugador_id, epj.indicadores, j.nombre, j.apellido, j.posicion
       FROM estadisticas_partido_jugadores epj
       JOIN jugadores j ON j.id = epj.jugador_id
       WHERE epj.partido_id = ?
       ORDER BY j.apellido, j.nombre`,
      [id]
    );

    res.json({
      id: partido.id,
      fecha: partido.fecha,
      rival: partido.rival,
      condicion: partido.condicion,
      resultado: partido.resultado,
      competencia: partido.competencia,
      tiene_archivo: Boolean(partido.archivo),
      equipo: JSON.parse(partido.equipo_indicadores),
      jugadores: filasJugadores.map((f) => ({
        id: f.id,
        jugador_id: f.jugador_id,
        nombre: f.nombre,
        apellido: f.apellido,
        posicion: f.posicion,
        indicadores: JSON.parse(f.indicadores),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el partido", error: error.message });
  }
};

const obtenerArchivoEstadisticasPartido = async (req, res) => {
  try {
    const { id } = req.params;
    const [partidos] = await db.query("SELECT archivo FROM estadisticas_partido WHERE id = ?", [id]);
    if (partidos.length === 0 || !partidos[0].archivo) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }
    await servirArchivo(req, res, partidos[0].archivo);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el archivo", error: error.message });
  }
};

const eliminarEstadisticasPartido = async (req, res) => {
  try {
    const { id } = req.params;
    const [partidos] = await db.query("SELECT archivo FROM estadisticas_partido WHERE id = ?", [id]);
    if (partidos.length === 0) {
      return res.status(404).json({ message: "Partido no encontrado" });
    }

    await db.query("DELETE FROM estadisticas_partido WHERE id = ?", [id]);

    if (partidos[0].archivo) {
      eliminarArchivo(partidos[0].archivo);
    }

    res.json({ message: "Partido eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el partido", error: error.message });
  }
};

module.exports = {
  previsualizarEstadisticasPartido,
  confirmarEstadisticasPartido,
  listarEstadisticasPartido,
  obtenerEstadisticasPartido,
  obtenerArchivoEstadisticasPartido,
  eliminarEstadisticasPartido,
};
