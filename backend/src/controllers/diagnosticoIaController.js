const db = require("../config/db");
const { generarTexto } = require("../config/gemini");

const INSTRUCCION_BASE =
  "Sos un asistente del cuerpo técnico del Club Atlético Lanús. A partir de los siguientes datos de un " +
  "jugador, escribí un diagnóstico breve de su estado actual y una lista de pasos concretos y accionables " +
  "para que evolucione y mejore. Respondé en español, en texto plano sin ningún símbolo de markdown (nada " +
  "de **, ###, guiones de lista ni backticks): separá las secciones y los pasos con títulos simples " +
  "seguidos de dos puntos y saltos de línea, y numerá los pasos como '1.', '2.', etc. No inventes datos " +
  "que no estén acá.";

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const noCumplioAun =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (noCumplioAun) edad--;
  return edad;
};

const encabezadoJugador = (jugador) => {
  const lineas = [`Jugador: ${jugador.nombre} ${jugador.apellido}${jugador.posicion ? ` (${jugador.posicion})` : ""}`];
  if (jugador.edad !== null) lineas.push(`Edad: ${jugador.edad} años`);
  if (jugador.categoria) lineas.push(`Categoría: ${jugador.categoria}`);
  return lineas;
};

// Cada área define: qué datos junta de la base (dataJugador) y cómo arma
// el prompt específico a partir de esos datos (prompt). Para sumar una
// nueva área (preparación física, psicología, análisis futbolístico) solo
// hace falta agregar una entrada acá.
const AREAS = {
  nutricion: {
    dataJugador: async (jugadorId, jugador) => {
      const [evaluaciones] = await db.query(
        `SELECT fecha, peso, talla,
                masa_muscular_kg, masa_adiposa_kg, masa_osea_kg, sumatoria_pliegues, indice_musculo_oseo, observaciones
         FROM nutricion_evaluaciones WHERE jugador_id = ? ORDER BY fecha DESC, id DESC LIMIT 1`,
        [jugadorId]
      );
      let evaluacion = evaluaciones[0] || null;
      if (evaluacion) {
        const peso = Number(evaluacion.peso);
        const pct = (kg) => (peso && kg !== null && kg !== undefined ? Math.round((Number(kg) / peso) * 10000) / 100 : null);
        evaluacion = {
          ...evaluacion,
          imc: peso && evaluacion.talla ? Math.round((peso / (evaluacion.talla / 100) ** 2) * 100) / 100 : null,
          masa_muscular_pct: pct(evaluacion.masa_muscular_kg),
          masa_adiposa_pct: pct(evaluacion.masa_adiposa_kg),
          masa_osea_pct: pct(evaluacion.masa_osea_kg),
        };
      }

      let objetivos = null;
      if (jugador.categoria) {
        const [filas] = await db.query("SELECT * FROM objetivos_nutricionales WHERE categoria = ?", [jugador.categoria]);
        objetivos = filas[0] || null;
      }

      return { evaluacion, objetivos };
    },
    prompt: (jugador, { evaluacion, objetivos }) => {
      const lineas = [INSTRUCCION_BASE, "", ...encabezadoJugador(jugador)];

      if (evaluacion) {
        lineas.push("\nÚltima evaluación nutricional/antropométrica:");
        lineas.push(`- Fecha: ${evaluacion.fecha}`);
        lineas.push(`- Peso: ${evaluacion.peso} kg, Talla: ${evaluacion.talla} cm, IMC: ${evaluacion.imc ?? "s/d"}`);
        lineas.push(
          `- Composición corporal: masa muscular ${evaluacion.masa_muscular_pct ?? "s/d"}%, ` +
            `masa adiposa ${evaluacion.masa_adiposa_pct ?? "s/d"}%, masa ósea ${evaluacion.masa_osea_pct ?? "s/d"}%`
        );
        lineas.push(`- Suma de 6 pliegues: ${evaluacion.sumatoria_pliegues ?? "s/d"} mm`);
        lineas.push(`- Índice músculo-óseo: ${evaluacion.indice_musculo_oseo ?? "s/d"}`);
        if (evaluacion.observaciones) lineas.push(`- Observaciones: ${evaluacion.observaciones}`);
      } else {
        lineas.push("\nNo hay evaluaciones nutricionales cargadas.");
      }

      if (objetivos) {
        lineas.push("\nObjetivos nutricionales de su categoría:");
        lineas.push(
          `- Peso objetivo: ${objetivos.peso_min ?? "s/d"} a ${objetivos.peso_max ?? "s/d"} kg, ` +
            `IMC objetivo: ${objetivos.imc_objetivo ?? "s/d"}, ` +
            `suma de 6 pliegues objetivo: ${objetivos.suma_6_pliegues_objetivo ?? "s/d"} mm, ` +
            `índice músculo-óseo objetivo: ${objetivos.indice_musculo_oseo_objetivo ?? "s/d"}`
        );
      }

      return lineas.join("\n");
    },
  },

  lesiones: {
    dataJugador: async (jugadorId) => {
      const [lesiones] = await db.query(
        `SELECT fecha, lesion, proceso_recuperacion, fecha_alta
         FROM lesiones WHERE jugador_id = ? ORDER BY fecha DESC, id DESC LIMIT 10`,
        [jugadorId]
      );
      return { lesiones };
    },
    prompt: (jugador, { lesiones }) => {
      const lineas = [INSTRUCCION_BASE, "", ...encabezadoJugador(jugador)];

      if (lesiones.length > 0) {
        lineas.push("\nHistorial de lesiones (de la más reciente a la más antigua):");
        lesiones.forEach((l) => {
          const estado = l.fecha_alta
            ? `dada de alta el ${l.fecha_alta}`
            : "sin fecha de alta registrada (posiblemente en curso)";
          lineas.push(`- ${l.fecha}: ${l.lesion}. ${estado}.${l.proceso_recuperacion ? ` Proceso: ${l.proceso_recuperacion}` : ""}`);
        });
      } else {
        lineas.push("\nNo hay lesiones registradas.");
      }

      return lineas.join("\n");
    },
  },
};

// Genera un nuevo diagnóstico con IA para un área puntual (nutrición,
// lesiones, ...) a partir del historial actual del jugador en esa área, y
// lo guarda como un registro nuevo (se acumulan cronológicamente por área).
const generarDiagnostico = async (req, res) => {
  try {
    const { id, area } = req.params;
    const definicionArea = AREAS[area];
    if (!definicionArea) {
      return res.status(400).json({ message: "Área de diagnóstico inválida" });
    }

    const generadoPor = req.usuario.id;

    const [jugadores] = await db.query(
      "SELECT nombre, apellido, fecha_nacimiento, posicion, categoria FROM jugadores WHERE id = ?",
      [id]
    );
    if (jugadores.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado" });
    }
    const jugador = { ...jugadores[0], edad: calcularEdad(jugadores[0].fecha_nacimiento) };

    const datos = await definicionArea.dataJugador(id, jugador);
    const prompt = definicionArea.prompt(jugador, datos);
    const contenido = await generarTexto(prompt);

    const [result] = await db.query(
      "INSERT INTO diagnosticos_ia (jugador_id, area, contenido, generado_por) VALUES (?, ?, ?, ?)",
      [id, area, contenido, generadoPor]
    );

    res.status(201).json({
      id: result.insertId,
      jugador_id: Number(id),
      area,
      contenido,
      creado_en: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar el diagnóstico con IA",
      error: error.message,
    });
  }
};

const listarDiagnosticos = async (req, res) => {
  try {
    const { id, area } = req.params;
    if (!AREAS[area]) {
      return res.status(400).json({ message: "Área de diagnóstico inválida" });
    }

    const [diagnosticos] = await db.query(
      `SELECT id, contenido, creado_en FROM diagnosticos_ia WHERE jugador_id = ? AND area = ? ORDER BY creado_en DESC, id DESC`,
      [id, area]
    );

    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar los diagnósticos",
      error: error.message,
    });
  }
};

module.exports = { generarDiagnostico, listarDiagnosticos };
