// Cliente mínimo para la API gratuita de Google Gemini (Google AI Studio),
// usada para generar el diagnóstico de evolución del jugador. No se agrega
// un SDK aparte: la API es un simple POST HTTP y Node ya trae fetch.
// Alias "latest" en vez de una versión fija: Google va discontinuando
// versiones viejas para cuentas nuevas: con el alias, el modelo activo se
// actualiza solo, sin que el código quede apuntando a algo dado de baja.
const MODELO = "gemini-flash-latest";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Reintentos con backoff solo para errores transitorios de Google (503
// "modelo sobrecargado" / 429 rate limit) — son errores de capacidad del
// lado de Google, no del PDF ni de la app, y el propio mensaje de error
// sugiere reintentar más tarde. El resto de los errores (API key inválida,
// contenido bloqueado, etc.) no se reintentan porque no se van a resolver solos.
const REINTENTOS_ESPERA_MS = [3000, 8000, 15000];

const llamarGemini = async (body, mensajeErrorGenerico) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el servidor");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`;

  let datos;
  for (let intento = 0; ; intento++) {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    datos = await respuesta.json();

    if (respuesta.ok) break;

    const esTransitorio = respuesta.status === 503 || respuesta.status === 429;
    if (!esTransitorio || intento >= REINTENTOS_ESPERA_MS.length) {
      throw new Error(datos?.error?.message || mensajeErrorGenerico);
    }
    console.error(`Gemini ${respuesta.status} (transitorio), reintentando en ${REINTENTOS_ESPERA_MS[intento]}ms...`, datos?.error?.message);
    await sleep(REINTENTOS_ESPERA_MS[intento]);
  }

  const candidato = datos?.candidates?.[0];
  const texto = candidato?.content?.parts?.map((p) => p.text).join("") || "";

  if (!texto) {
    // finishReason distingue por qué no hay texto: MAX_TOKENS (se cortó por
    // el límite de salida, típico con PDFs de plantel completo con muchos
    // jugadores/indicadores) vs SAFETY/PROHIBITED_CONTENT (Gemini bloqueó el
    // archivo) vs otra causa. Sin esto, todo se veía igual ("no devolvió
    // resultado") y no había forma de saber cuál era desde los logs.
    console.error("Gemini no devolvió texto.", { finishReason: candidato?.finishReason, promptFeedback: datos?.promptFeedback });
    if (candidato?.finishReason === "MAX_TOKENS") {
      throw new Error("La IA cortó la respuesta por ser muy larga (demasiados jugadores/indicadores en el PDF). Probá con un PDF más chico o menos jugadores por importación.");
    }
    if (candidato?.finishReason === "SAFETY" || candidato?.finishReason === "PROHIBITED_CONTENT") {
      throw new Error("Gemini bloqueó el archivo (filtro de contenido). Probá con otro PDF.");
    }
    throw new Error("La IA no devolvió ningún resultado");
  }

  return texto;
};

// Genera texto a partir de un prompt. Lanza un error si falta la API key o
// si la API responde con error (se traduce a un mensaje entendible).
const generarTexto = (prompt) =>
  llamarGemini({ contents: [{ parts: [{ text: prompt }] }] }, "Error al generar el diagnóstico con IA");

// Igual que generarTexto, pero además manda un archivo (PDF, imagen) como
// parte multimodal del pedido, y le pide a Gemini que responda en JSON
// puro (sin fences de markdown) — usado para que la IA lea un PDF y
// devuelva datos estructurados, en vez de un diagnóstico en texto libre.
const generarJSON = async (prompt, archivo) => {
  const texto = await llamarGemini(
    {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: archivo.mimeType, data: archivo.buffer.toString("base64") } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    },
    "Error al procesar el archivo con IA"
  );

  try {
    return JSON.parse(texto);
  } catch {
    console.error("Gemini devolvió JSON inválido.", { largo: texto.length, inicio: texto.slice(0, 200), fin: texto.slice(-200) });
    throw new Error("La IA no devolvió un JSON válido");
  }
};

// Igual que generarTexto, pero en un solo llamado (sin archivo, sin
// historial) le pide a Gemini que responda en JSON puro — usado para
// cálculos puntuales (ej. el semáforo de riesgo) donde no hace falta una
// conversación.
const generarJSONDesdeTexto = async (prompt, mensajeErrorGenerico) => {
  const texto = await llamarGemini(
    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } },
    mensajeErrorGenerico || "Error al generar el análisis con IA"
  );

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error("La IA no devolvió un JSON válido");
  }
};

// Conversación de varios turnos (chat). `historial` es un array de
// { rol: 'usuario'|'asistente', contenido } en orden cronológico, incluido
// el último mensaje del usuario. `systemInstruction` fija el contexto/reglas
// fuera del historial (no cuenta como un turno). Responde en JSON puro.
const generarConversacion = async (systemInstruction, historial) => {
  const texto = await llamarGemini(
    {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: historial.map((m) => ({
        role: m.rol === "usuario" ? "user" : "model",
        parts: [{ text: m.contenido }],
      })),
      generationConfig: { responseMimeType: "application/json" },
    },
    "Error al generar la respuesta del chat"
  );

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error("La IA no devolvió un JSON válido");
  }
};

module.exports = { generarTexto, generarJSON, generarJSONDesdeTexto, generarConversacion };
