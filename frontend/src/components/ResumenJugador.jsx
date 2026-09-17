import { useEffect, useState } from 'react'
import api from '../api/client'
import GraficoTendencia from './GraficoTendencia'
import './ResumenJugador.css'

const ESTADISTICAS_VACIAS = { minutos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0 }

// Mismo indicador que ya usa Preparación física (ver PLANTILLA_INDICADORES
// en JugadorPreparacionFisica.jsx / gpsImportController.js) — se toma uno
// solo como resumen introductorio, el detalle completo queda en su área.
const CATEGORIA_GPS = 'Volumen de trabajo'
const INDICADOR_GPS = 'Distancia total (m)'

const PLIEGUES = [
  'pliegue_triceps', 'pliegue_subescapular', 'pliegue_supraespinal',
  'pliegue_abdominal', 'pliegue_muslo', 'pliegue_pantorrilla',
]

const sumaPliegues = (evaluacion) => {
  if (!evaluacion) return null
  let total = 0
  for (const campo of PLIEGUES) {
    const valor = Number(evaluacion[campo])
    if (!Number.isFinite(valor)) return null
    total += valor
  }
  return Math.round(total * 10) / 10
}

/**
 * Dashboard resumen de la ficha individual de un jugador — "carta de
 * presentación" con lo más relevante de cada área, no el detalle completo
 * (que sigue viviendo en su área propia dentro de "Áreas"). Se apoya en
 * datos ya existentes (estadísticas de partido, picos de rendimiento,
 * evaluaciones nutricionales) sin duplicar ninguna carga.
 */
export default function ResumenJugador({ jugadorId, jugador }) {
  const [estadisticas, setEstadisticas] = useState(ESTADISTICAS_VACIAS)
  const [puntosGps, setPuntosGps] = useState([])
  const [nutricion, setNutricion] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    Promise.all([
      api.get(`/jugadores/${jugadorId}/estadisticas`),
      api.get(`/jugadores/${jugadorId}/picos-rendimiento`),
      api.get(`/jugadores/${jugadorId}/nutricion/resumen`),
    ])
      .then(([resEstadisticas, resPicos, resNutricion]) => {
        setEstadisticas(resEstadisticas.data)
        setPuntosGps(
          resPicos.data
            .map((p) => ({
              fecha: p.fecha,
              valor: p.indicadores.find((i) => i.categoria === CATEGORIA_GPS && i.indicador === INDICADOR_GPS)?.valor,
            }))
            .filter((p) => typeof p.valor === 'number')
        )
        setNutricion(resNutricion.data)
      })
      .catch(() => {
        // El resumen es un complemento informativo — si algo falla, la
        // ficha completa (Info/Características/Áreas) sigue funcionando
        // igual, no tiene sentido bloquearla por esto.
      })
      .finally(() => setCargando(false))
  }, [jugadorId])

  const anioActual = new Date().getFullYear()
  const sumaActual = sumaPliegues(nutricion?.ultima_evaluacion)
  const sumaObjetivo = nutricion?.objetivos?.suma_6_pliegues_objetivo

  return (
    <div className="card resumen-jugador">
      <div className="resumen-jugador-titulo">
        <h3>Resumen {anioActual}</h3>
        {cargando && <span className="spinner spinner-dark" />}
      </div>

      <div className="resumen-tiles">
        <TileResumen etiqueta="Edad" valor={jugador.edad ?? '—'} />
        <TileResumen etiqueta="Minutos" valor={estadisticas.minutos} />
        <TileResumen etiqueta="Goles" valor={estadisticas.goles} />
        <TileResumen etiqueta="Asistencias" valor={estadisticas.asistencias} />
        <TileResumen etiqueta="Amarillas" valor={estadisticas.amarillas} tono="amarillo" />
        <TileResumen etiqueta="Rojas" valor={estadisticas.rojas} tono="rojo" />
        <TileResumen etiqueta="Rating" valor="—" pendiente />
      </div>

      <div className="resumen-cuerpo">
        <div className="resumen-bloque">
          <span className="resumen-bloque-titulo">GPS — {INDICADOR_GPS}</span>
          {puntosGps.length >= 2 ? (
            <GraficoTendencia puntos={puntosGps} etiqueta={INDICADOR_GPS} />
          ) : (
            <p className="texto-muted">Sin suficientes cargas de GPS todavía para mostrar una tendencia.</p>
          )}
        </div>

        <div className="resumen-bloque">
          <span className="resumen-bloque-titulo">Nutrición — Suma de 6 pliegues</span>
          {sumaActual !== null ? (
            <div className="resumen-nutricion-destacado">
              <span className="resumen-nutricion-valor">{sumaActual} mm</span>
              {sumaObjetivo && (
                <span className="texto-muted">Objetivo de su categoría: {sumaObjetivo} mm</span>
              )}
            </div>
          ) : (
            <p className="texto-muted">Todavía no hay una evaluación nutricional completa.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TileResumen({ etiqueta, valor, tono, pendiente }) {
  return (
    <div className={`resumen-tile ${tono ? `resumen-tile-${tono}` : ''} ${pendiente ? 'resumen-tile-pendiente' : ''}`}>
      <span className="resumen-tile-valor">{valor}</span>
      <span className="resumen-tile-etiqueta">{etiqueta}</span>
    </div>
  )
}
