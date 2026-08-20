const db = require("../config/db");

// Cuántas filas de picos_rendimiento (de todo el plantel de la categoría) se
// juntan como contexto. Alcanza y sobra para "sacar conclusiones" sin
// inflar el prompt con años de historial.
const MAX_FILAS_PICOS = 200;

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

const seccionLesiones = (lesiones) => {
  if (lesiones.length === 0) return "Historial de lesiones: no hay lesiones registradas.";
  const lineas = lesiones.map((l) => {
    const estado = l.fecha_alta ? `dada de alta el ${l.fecha_alta}` : "sin fecha de alta registrada (posiblemente en curso)";
    return `- ${l.fecha}: ${l.lesion}. ${estado}.${l.proceso_recuperacion ? ` Proceso: ${l.proceso_recuperacion}` : ""}`;
  });
  return ["Historial de lesiones (de la más reciente a la más antigua):", ...lineas].join("\n");
};

const seccionComposicion = (composiciones) => {
  if (composiciones.length === 0) return "Composición corporal: no hay mediciones registradas.";
  const lineas = composiciones.map(
    (c) => `- ${c.fecha}: peso ${c.peso} kg, grasa corporal ${c.grasa_corporal_pct ?? "s/d"}%.${c.observaciones ? ` ${c.observaciones}` : ""}`
  );
  return ["Composición corporal (mediciones recientes, de la más reciente a la más antigua):", ...lineas].join("\n");
};

const seccionNutricion = (evaluacion, objetivos) => {
  if (!evaluacion) return "Nutrición/antropometría: no hay evaluaciones cargadas.";

  const peso = Number(evaluacion.peso);
  const pct = (kg) => (peso && kg !== null && kg !== undefined ? Math.round((Number(kg) / peso) * 10000) / 100 : null);
  const imc = peso && evaluacion.talla ? Math.round((peso / (evaluacion.talla / 100) ** 2) * 100) / 100 : null;

  const lineas = [
    "Última evaluación nutricional/antropométrica:",
    `- Fecha: ${evaluacion.fecha}`,
    `- Peso: ${evaluacion.peso} kg, Talla: ${evaluacion.talla} cm, IMC: ${imc ?? "s/d"}`,
    `- Composición: masa muscular ${pct(evaluacion.masa_muscular_kg) ?? "s/d"}%, masa adiposa ${pct(evaluacion.masa_adiposa_kg) ?? "s/d"}%, masa ósea ${pct(evaluacion.masa_osea_kg) ?? "s/d"}%`,
    `- Suma de 6 pliegues: ${evaluacion.sumatoria_pliegues ?? "s/d"} mm`,
    `- Índice músculo-óseo: ${evaluacion.indice_musculo_oseo ?? "s/d"}`,
  ];
  if (evaluacion.observaciones) lineas.push(`- Observaciones: ${evaluacion.observaciones}`);

  if (objetivos && (objetivos.suma_6_pliegues_objetivo != null || objetivos.indice_musculo_oseo_objetivo != null)) {
    lineas.push(
      `Objetivos nutricionales de su categoría: suma de 6 pliegues objetivo ${objetivos.suma_6_pliegues_objetivo ?? "s/d"} mm, ` +
        `índice músculo-óseo objetivo ${objetivos.indice_musculo_oseo_objetivo ?? "s/d"}`
    );
  }

  return lineas.join("\n");
};

const seccionCargas = (picos, plantel) => {
  if (picos.length === 0) return "Cargas físicas / GPS: todavía no hay cargas cargadas en esta categoría.";

  const nombrePorId = Object.fromEntries(plantel.map((j) => [j.id, `${j.nombre} ${j.apellido}`]));
  const lineas = picos.map((p) => {
    const indicadores = JSON.parse(p.indicadores)
      .map((i) => `${i.indicador}=${i.valor}`)
      .join(", ");
    const fecha = new Date(p.fecha).toISOString().slice(0, 10);
    return `- ${nombrePorId[p.jugador_id] || `jugador ${p.jugador_id}`} | ${fecha} | ${p.partido}: ${indicadores}`;
  });
  return ["Cargas físicas / GPS de todo el plantel de la categoría (para poder comparar):", ...lineas].join("\n");
};

// Arma todo el contexto de datos reales de un jugador (lesiones, composición
// corporal, nutrición, cargas físicas/GPS de su categoría, y su semáforo de
// análisis futbolístico), en un solo texto listo para mandarle a la IA.
// Deliberadamente NO incluye el perfil psicosocial: es de acceso exclusivo
// del psicólogo asignado (ver informesPsicologicosController.js), y no
// corresponde sumarlo al contexto general del cuerpo técnico.
const armarContextoCompleto = async (jugadorId) => {
  const [jugadores] = await db.query(
    "SELECT id, nombre, apellido, fecha_nacimiento, posicion, categoria, semaforo_analisis FROM jugadores WHERE id = ?",
    [jugadorId]
  );
  if (jugadores.length === 0) return null;
  const jugador = { ...jugadores[0], edad: calcularEdad(jugadores[0].fecha_nacimiento) };

  const [lesiones] = await db.query(
    `SELECT fecha, lesion, proceso_recuperacion, fecha_alta FROM lesiones WHERE jugador_id = ? ORDER BY fecha DESC, id DESC LIMIT 10`,
    [jugadorId]
  );

  const [composiciones] = await db.query(
    `SELECT fecha, peso, grasa_corporal_pct, observaciones FROM composicion_corporal WHERE jugador_id = ? ORDER BY fecha DESC, id DESC LIMIT 5`,
    [jugadorId]
  );

  const [evaluacionesNutricion] = await db.query(
    `SELECT fecha, peso, talla, masa_muscular_kg, masa_adiposa_kg, masa_osea_kg, sumatoria_pliegues, indice_musculo_oseo, observaciones
     FROM nutricion_evaluaciones WHERE jugador_id = ? ORDER BY fecha DESC, id DESC LIMIT 1`,
    [jugadorId]
  );
  const evaluacionNutricion = evaluacionesNutricion[0] || null;

  let objetivosNutricion = null;
  if (jugador.categoria) {
    const [filas] = await db.query(
      "SELECT suma_6_pliegues_objetivo, indice_musculo_oseo_objetivo FROM objetivos_nutricionales WHERE categoria = ?",
      [jugador.categoria]
    );
    objetivosNutricion = filas[0] || null;
  }

  const [plantel] = await db.query(
    "SELECT id, nombre, apellido, posicion FROM jugadores WHERE categoria <=> ? ORDER BY apellido, nombre",
    [jugador.categoria]
  );
  const idsPlantel = plantel.map((j) => j.id);
  let picos = [];
  if (idsPlantel.length > 0) {
    const [filas] = await db.query(
      `SELECT jugador_id, fecha, partido, indicadores FROM picos_rendimiento
       WHERE jugador_id IN (?) ORDER BY fecha DESC, id DESC LIMIT ?`,
      [idsPlantel, MAX_FILAS_PICOS]
    );
    picos = filas;
  }

  const encabezado = `Jugador: ${jugador.nombre} ${jugador.apellido}${jugador.posicion ? ` (${jugador.posicion})` : ""}` +
    `${jugador.edad !== null ? `, ${jugador.edad} años` : ""}${jugador.categoria ? `, categoría ${jugador.categoria}` : ""}.` +
    `${jugador.semaforo_analisis ? ` Semáforo de análisis futbolístico (chances de jugar en primera): ${jugador.semaforo_analisis}.` : ""}`;

  const texto = [
    encabezado,
    "",
    seccionLesiones(lesiones),
    "",
    seccionComposicion(composiciones),
    "",
    seccionNutricion(evaluacionNutricion, objetivosNutricion),
    "",
    seccionCargas(picos, plantel),
  ].join("\n");

  const listaPlantel =
    plantel.map((j) => `- id ${j.id}: ${j.nombre} ${j.apellido}${j.posicion ? ` (${j.posicion})` : ""}`).join("\n") ||
    "(sin otros jugadores cargados en esta categoría)";

  return { jugador, texto, listaPlantel };
};

module.exports = { armarContextoCompleto };
