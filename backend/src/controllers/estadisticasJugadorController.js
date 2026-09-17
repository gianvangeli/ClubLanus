const db = require("../config/db");
const { BLOQUES_JUGADOR } = require("./estadisticasPartidoController");

// Los mismos 5 indicadores "Generales" que ya usa el informe de partido
// (estadisticasPartidoController.js) — se valida contra ese vocabulario en
// vez de solo hardcodear los strings, para que si algún día cambian ahí
// esto falle ruidosamente acá en vez de dejar de sumar en silencio.
const GENERALES = BLOQUES_JUGADOR.find((b) => b.categoria === "Generales").indicadores;
const IND = {
  minutos: "Minutos jugados",
  goles: "Goles",
  asistencias: "Asistencias",
  amarillas: "Tarjetas amarillas",
  rojas: "Tarjetas rojas",
};
Object.values(IND).forEach((nombre) => {
  if (!GENERALES.includes(nombre)) {
    throw new Error(`estadisticasJugadorController: el indicador "${nombre}" ya no está en BLOQUES_JUGADOR`);
  }
});

const vacio = () => ({ minutos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0 });

// "Temporada" = año calendario, sin tabla propia. Suma, para el/los
// jugador(es) pedidos, los indicadores "Generales" de todos los partidos
// con informe PDF (único origen con desglose por jugador — los generados
// por IA desde video son solo de equipo) cuya fecha caiga en ese año.
const calcularEstadisticasTemporada = async (anio, jugadorId = null) => {
  const [partidos] = await db.query(
    "SELECT id FROM estadisticas_partido WHERE origen = 'pdf' AND YEAR(fecha) = ?",
    [anio]
  );
  const resultado = {};
  if (partidos.length === 0) return resultado;

  const placeholders = partidos.map(() => "?").join(",");
  const params = partidos.map((p) => p.id);
  let condicionJugador = "";
  if (jugadorId) {
    condicionJugador = " AND jugador_id = ?";
    params.push(jugadorId);
  }
  const [filas] = await db.query(
    `SELECT jugador_id, indicadores FROM estadisticas_partido_jugadores WHERE partido_id IN (${placeholders})${condicionJugador}`,
    params
  );

  for (const fila of filas) {
    let items;
    try {
      items = JSON.parse(fila.indicadores);
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;

    const acc = resultado[fila.jugador_id] || vacio();
    for (const item of items) {
      if (item.indicador === IND.minutos) acc.minutos += Number(item.valor) || 0;
      else if (item.indicador === IND.goles) acc.goles += Number(item.valor) || 0;
      else if (item.indicador === IND.asistencias) acc.asistencias += Number(item.valor) || 0;
      else if (item.indicador === IND.amarillas) acc.amarillas += Number(item.valor) || 0;
      else if (item.indicador === IND.rojas) acc.rojas += Number(item.valor) || 0;
    }
    resultado[fila.jugador_id] = acc;
  }
  return resultado;
};

const anioActual = () => new Date().getFullYear();

// Estadísticas de TODO el plantel para un año — usado por el listado.
const obtenerEstadisticasPlantel = async (req, res) => {
  try {
    const anio = Number(req.query.anio) || anioActual();
    const resultado = await calcularEstadisticasTemporada(anio);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ message: "Error al calcular las estadísticas del plantel", error: error.message });
  }
};

// Estadísticas de UN jugador para un año — usado por el dashboard de ficha individual.
const obtenerEstadisticasJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const anio = Number(req.query.anio) || anioActual();
    const resultado = await calcularEstadisticasTemporada(anio, id);
    res.json(resultado[id] || vacio());
  } catch (error) {
    res.status(500).json({ message: "Error al calcular las estadísticas del jugador", error: error.message });
  }
};

module.exports = { obtenerEstadisticasPlantel, obtenerEstadisticasJugador };
