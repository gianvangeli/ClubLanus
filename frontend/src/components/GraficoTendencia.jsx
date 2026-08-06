import { useState } from 'react'
import './GraficoTendencia.css'

const ANCHO = 480
const ALTO = 180
const PAD_IZQ = 44
const PAD_DER = 16
const PAD_ARR = 16
const PAD_AB = 28

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// "DD MMM" en UTC (fecha es una columna DATE sin hora: usar componentes
// locales del navegador la correría un día según el huso horario).
const formatFechaCorta = (fecha) => {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MESES[d.getUTCMonth()]}`
}

// Línea de tendencia de un único indicador en el tiempo (serie única: no
// hace falta leyenda, el título ya la nombra). Eje X ordinal (una posición
// por evaluación, no por fecha continua) porque las evaluaciones no caen en
// intervalos regulares — evita huecos raros cuando pasan semanas sin cargar.
export default function GraficoTendencia({ puntos, etiqueta, unidad }) {
  const [hover, setHover] = useState(null)

  const ordenados = [...(puntos || [])]
    .filter((p) => typeof p.valor === 'number' && !Number.isNaN(p.valor))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  if (ordenados.length < 2) {
    return (
      <div className="gt-vacio">
        <p className="texto-muted">Cargá al menos 2 evaluaciones con "{etiqueta}" para ver la tendencia.</p>
      </div>
    )
  }

  const valores = ordenados.map((p) => p.valor)
  let valMin = Math.min(...valores)
  let valMax = Math.max(...valores)
  if (valMin === valMax) {
    valMin -= 1
    valMax += 1
  } else {
    const margen = (valMax - valMin) * 0.12
    valMin -= margen
    valMax += margen
  }

  const anchoUtil = ANCHO - PAD_IZQ - PAD_DER
  const altoUtil = ALTO - PAD_ARR - PAD_AB

  const x = (i) => PAD_IZQ + (ordenados.length === 1 ? anchoUtil / 2 : (i / (ordenados.length - 1)) * anchoUtil)
  const y = (v) => PAD_ARR + altoUtil - ((v - valMin) / (valMax - valMin)) * altoUtil

  const puntosXY = ordenados.map((p, i) => ({ ...p, cx: x(i), cy: y(p.valor) }))
  const lineaPath = puntosXY.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.cx},${p.cy}`).join(' ')

  const lineasGrilla = [valMin, (valMin + valMax) / 2, valMax]

  return (
    <div className="gt-wrap">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="gt-svg" preserveAspectRatio="xMidYMid meet">
        {lineasGrilla.map((v, i) => (
          <g key={i}>
            <line x1={PAD_IZQ} x2={ANCHO - PAD_DER} y1={y(v)} y2={y(v)} className="gt-grilla" />
            <text x={PAD_IZQ - 8} y={y(v)} className="gt-eje-label" textAnchor="end" dominantBaseline="middle">
              {Math.round(v * 100) / 100}
            </text>
          </g>
        ))}

        <path d={lineaPath} className="gt-linea" fill="none" />

        {puntosXY.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((prev) => (prev === i ? null : prev))}
          >
            <circle cx={p.cx} cy={p.cy} r={10} fill="transparent" />
            <circle cx={p.cx} cy={p.cy} r={4} className="gt-punto" />
            {hover === i && <line x1={p.cx} x2={p.cx} y1={PAD_ARR} y2={ALTO - PAD_AB} className="gt-crosshair" />}
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="gt-tooltip"
          style={{ left: `${(puntosXY[hover].cx / ANCHO) * 100}%` }}
        >
          <strong>
            {puntosXY[hover].valor}
            {unidad ? ` ${unidad}` : ''}
          </strong>
          <span>{formatFechaCorta(puntosXY[hover].fecha)}</span>
        </div>
      )}
    </div>
  )
}
