const db = require("../config/db");

const SEMAFORO_A_ESTADO = { verde: "good", amarillo: "warning", rojo: "critical" };

const estadoDesdeSemaforo = (semaforo, etiquetaSinDatos) => {
  if (!semaforo) return { estado: "sin_datos", etiqueta: etiquetaSinDatos };
  return { estado: SEMAFORO_A_ESTADO[semaforo], etiqueta: semaforo.charAt(0).toUpperCase() + semaforo.slice(1) };
};

// Preparación física (cargas físicas vs. objetivos por puesto) y Datos
// (Big Data, interpretación automática de informes) todavía no tienen un
// criterio definido por el cuerpo técnico: se muestran como pendientes en
// vez de inventar una regla.
const PENDIENTE = { estado: "sin_datos", etiqueta: "Pendiente de definir" };

const listarResumenGeneral = async (req, res) => {
  try {
    const [jugadores] = await db.query(
      `SELECT id, nombre, apellido, categoria, posicion, semaforo_psicologico, semaforo_analisis,
              semaforo_riesgo_ia, motivo_riesgo_ia
       FROM jugadores ORDER BY apellido, nombre`
    );

    const [evaluaciones] = await db.query(
      `SELECT ne.jugador_id, ne.sumatoria_pliegues, ne.indice_musculo_oseo
       FROM nutricion_evaluaciones ne
       INNER JOIN (SELECT jugador_id, MAX(id) AS max_id FROM nutricion_evaluaciones GROUP BY jugador_id) ult
         ON ult.max_id = ne.id`
    );
    const [objetivos] = await db.query(
      "SELECT categoria, suma_6_pliegues_objetivo, indice_musculo_oseo_objetivo FROM objetivos_nutricionales"
    );
    const [lesionesActivas] = await db.query(
      "SELECT jugador_id, COUNT(*) AS activas FROM lesiones WHERE fecha_alta IS NULL OR fecha_alta > CURDATE() GROUP BY jugador_id"
    );

    const mapaEvaluaciones = new Map(evaluaciones.map((e) => [e.jugador_id, e]));
    const mapaObjetivos = new Map(objetivos.map((o) => [o.categoria, o]));
    const mapaLesiones = new Map(lesionesActivas.map((l) => [l.jugador_id, l.activas]));

    const resumen = jugadores.map((j) => {
      // Nutrición: compara la última evaluación contra los objetivos
      // antropométricos de la categoría del jugador (suma de 6 pliegues e
      // índice músculo-óseo, ver objetivosNutricionalesController.js).
      let nutricion = { estado: "sin_datos", etiqueta: "Sin evaluaciones" };
      const evaluacion = mapaEvaluaciones.get(j.id);
      const objetivo = j.categoria ? mapaObjetivos.get(j.categoria) : null;
      if (evaluacion && objetivo && objetivo.suma_6_pliegues_objetivo != null && objetivo.indice_musculo_oseo_objetivo != null) {
        if (evaluacion.sumatoria_pliegues != null && evaluacion.indice_musculo_oseo != null) {
          const superaPliegues = Number(evaluacion.sumatoria_pliegues) > Number(objetivo.suma_6_pliegues_objetivo);
          const bajoIndiceMuscular = Number(evaluacion.indice_musculo_oseo) < Number(objetivo.indice_musculo_oseo_objetivo);
          if (!superaPliegues && !bajoIndiceMuscular) nutricion = { estado: "good", etiqueta: "Óptimo" };
          else if (superaPliegues && bajoIndiceMuscular) nutricion = { estado: "critical", etiqueta: "Bajar MA / subir MM" };
          else nutricion = { estado: "warning", etiqueta: superaPliegues ? "Bajar masa adiposa" : "Subir masa muscular" };
        }
      } else if (evaluacion && !objetivo) {
        nutricion = { estado: "sin_datos", etiqueta: "Sin objetivos de categoría" };
      }

      // Lesiones: no es un semáforo, solo indica si tiene una lesión
      // activa (sin fecha de alta) en este momento o no.
      const lesionesCount = mapaLesiones.get(j.id) || 0;
      const lesiones =
        lesionesCount > 0
          ? { estado: "critical", etiqueta: "Lesionado" }
          : { estado: "good", etiqueta: "Sin lesión" };

      // Psicología: semáforo manual, exclusivo del psicólogo asignado.
      const psicologia = estadoDesdeSemaforo(j.semaforo_psicologico, "Sin evaluar");

      // Análisis futbolístico: semáforo manual, lo carga el cuerpo
      // técnico (chances de jugar en primera).
      const analisisFutbolistico = estadoDesdeSemaforo(j.semaforo_analisis, "Sin evaluar");

      // Riesgo de lesión: a diferencia de los semáforos manuales de arriba,
      // este lo calcula el Asistente IA solo (ver riesgoIa.js), cada vez que
      // se carga un dato relevante del jugador.
      const riesgoIa = j.semaforo_riesgo_ia
        ? { estado: SEMAFORO_A_ESTADO[j.semaforo_riesgo_ia], etiqueta: j.motivo_riesgo_ia || "Sin motivo" }
        : { estado: "sin_datos", etiqueta: "Sin evaluar" };

      return {
        id: j.id,
        nombre: j.nombre,
        apellido: j.apellido,
        categoria: j.categoria,
        posicion: j.posicion,
        areas: {
          nutricion,
          lesiones,
          psicologia,
          preparacion_fisica: PENDIENTE,
          analisis_futbolistico: analisisFutbolistico,
          datos_bigdata: PENDIENTE,
          riesgo_ia: riesgoIa,
        },
      };
    });

    res.json(resumen);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el resumen general",
      error: error.message,
    });
  }
};

module.exports = { listarResumenGeneral };
