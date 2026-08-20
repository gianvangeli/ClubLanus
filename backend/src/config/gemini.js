// Cliente mínimo para la API gratuita de Google Gemini (Google AI Studio),
// usada para generar el diagnóstico de evolución del jugador. No se agrega
// un SDK aparte: la API es un simple POST HTTP y Node ya trae fetch.
// Alias "latest" en vez de una versión fija: Google va discontinuando
// versiones viejas para cuentas nuevas: con el alias, el modelo activo se
// actualiza solo, sin que el código quede apuntando a algo dado de baja.
const MODELO = "gemini-flash-latest";

const llamarGemini = async (body, mensajeErrorGenerico) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el servidor");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`;

  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos?.error?.message || mensajeErrorGenerico);
  }

  const texto = datos?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!texto) {
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
