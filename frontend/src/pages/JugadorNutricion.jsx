import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import NutricionTabs from '../components/NutricionTabs'
import DiagnosticoIA from '../components/DiagnosticoIA'
import { COLOR_GOOD, COLOR_WARNING, COLOR_CRITICAL, ZONAS_INDICE_MO, ZONAS_SUMA_6PL } from '../utils/nutricionZonas'
import './AdminJugadorDetalle.css'
import './JugadorNutricion.css'

// Colores por masa: identidad (categórico), no estado — orden fijo,
// validado con el script de la skill de dataviz (5 slots, --pairs all,
// modo claro): sin fallos duros de separación CVD/contraste.
const MASAS = [
  { key: 'masa_muscular_pct', etiqueta: 'Masa muscular', color: '#2a78d6' },
  { key: 'masa_adiposa_pct', etiqueta: 'Masa adiposa', color: '#e34948' },
  { key: 'masa_osea_pct', etiqueta: 'Masa ósea', color: '#4a3aa7' },
  { key: 'masa_residual_pct', etiqueta: 'Masa residual', color: '#eda100' },
  { key: 'masa_piel_pct', etiqueta: 'Masa de la piel', color: '#008300' },
]

export default function JugadorNutricion() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)

  useEffect(() => {
    api.get(`/jugadores/${id}`).then(({ data }) => setJugador(data))
  }, [id])

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  return (
    <div className="page">
      <Link to={`/admin/jugadores/${id}`} className="btn btn-ghost btn-sm">
        ← Volver a la ficha
      </Link>

      <div className="seccion-especializada-header">
        <h1>Nutrición del jugador{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="nutricion" />
      </div>

      <NutricionTabs jugadorId={id} activa="informe" />

      <InformeNutricional jugadorId={id} />

      <DiagnosticoIA
        jugadorId={id}
        area="nutricion"
        titulo="Diagnóstico nutricional con IA"
        descripcion="Generado a partir de la última evaluación nutricional y los objetivos de la categoría del jugador."
      />
    </div>
  )
}

function InformeNutricional({ jugadorId }) {
  const [resumen, setResumen] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    Promise.all([
      api.get(`/jugadores/${jugadorId}/nutricion/resumen`),
      api.get(`/jugadores/${jugadorId}/nutricion`),
    ])
      .then(([resumenRes, historialRes]) => {
        setResumen(resumenRes.data)
        setHistorial(historialRes.data)
      })
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el informe nutricional')))
      .finally(() => setCargando(false))
  }, [jugadorId])

  if (cargando) {
    return (
      <div className="empty-state">
        <span className="spinner spinner-dark" />
      </div>
    )
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  const { categoria, ultima_evaluacion: ultima, objetivos } = resumen

  if (!ultima) {
    return (
      <div className="empty-state card">
        <p>Todavía no hay evaluaciones nutricionales cargadas para este jugador.</p>
        <Link to={`/admin/jugadores/${jugadorId}/nutricion/evaluaciones`} className="btn btn-primary btn-sm">
          Cargar la primera evaluación
        </Link>
      </div>
    )
  }

  return (
    <div className="nutri-informe">
      <ObjetivosBanner categoria={categoria} objetivos={objetivos} />

      <DatosHeader evaluacion={ultima} />

      <p className="texto-muted nutri-fecha-evaluacion">
        Última evaluación: {formatFecha(ultima.fecha)}
      </p>

      <div className="nutri-graficos-grid">
        <PieFraccionamiento evaluacion={ultima} />
        <BarraGauge
          titulo="Índice M.O."
          valor={ultima.indice_musculo_oseo}
          min={2.8}
          max={6.0}
          zonas={ZONAS_INDICE_MO}
        />
        <BarraGauge
          titulo="Suma de 6 pliegues"
          valor={ultima.sumatoria_pliegues}
          min={33.8}
          max={72.9}
          zonas={ZONAS_SUMA_6PL}
          unidad=" mm"
        />
      </div>

      <CuadranteImoSuma6pl
        indiceMO={ultima.indice_musculo_oseo}
        suma6pl={ultima.sumatoria_pliegues}
        objetivoSuma6pl={objetivos?.suma_6_pliegues_objetivo}
        objetivoIndiceMO={objetivos?.indice_musculo_oseo_objetivo}
      />

      <HistorialTabla evaluaciones={historial} />
    </div>
  )
}

function DatosHeader({ evaluacion }) {
  const edad = evaluacion.edad_decimal != null ? Math.floor(evaluacion.edad_decimal) : null

  return (
    <div className="nutri-datos-header">
      <div className="nutri-dato-box">
        <span className="nutri-dato-label">Peso</span>
        <strong>{evaluacion.peso} kg</strong>
      </div>
      <div className="nutri-dato-box">
        <span className="nutri-dato-label">Talla</span>
        <strong>{evaluacion.talla} cm</strong>
      </div>
      <div className="nutri-dato-box">
        <span className="nutri-dato-label">Edad</span>
        <strong>{edad != null ? `${edad} años` : '—'}</strong>
      </div>
    </div>
  )
}

function HistorialTabla({ evaluaciones }) {
  if (evaluaciones.length === 0) return null

  return (
    <div className="card nutri-grafico nutri-grafico-ancho">
      <h4>Historial de 5 componentes</h4>
      <div className="tabla-scroll">
        <table className="tabla tabla-compacta tabla-nutricion">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso (kg)</th>
              <th>Kg MM</th>
              <th>Kg MA</th>
              <th>IMC</th>
              <th>Σ 6 PL (mm)</th>
            </tr>
          </thead>
          <tbody>
            {evaluaciones.map((e) => (
              <tr key={e.id}>
                <td>{formatFecha(e.fecha)}</td>
                <td>{e.peso}</td>
                <td>{e.masa_muscular_kg}</td>
                <td>{e.masa_adiposa_kg}</td>
                <td>{e.imc ?? '—'}</td>
                <td>{e.sumatoria_pliegues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ObjetivosBanner({ categoria, objetivos }) {
  if (!objetivos) {
    return (
      <div className="alert alert-warning">
        No hay objetivos nutricionales configurados para la categoría {categoria || '(sin categoría asignada)'}.{' '}
        <Link to="/admin/objetivos-nutricionales">Configurarlos</Link>
      </div>
    )
  }

  return (
    <div className="card nutri-objetivos">
      <div className="nutri-objetivos-header">
        <h4>Objetivos vigentes — {categoria}</h4>
        <Link to="/admin/objetivos-nutricionales" className="btn btn-ghost btn-sm">
          Ver configuración
        </Link>
      </div>
      <div className="nutri-objetivos-grid">
        <div className="nutri-objetivo">
          <span className="nutri-objetivo-label">Suma de 6 pliegues</span>
          <strong>Inferior a {objetivos.suma_6_pliegues_objetivo ?? '—'} mm</strong>
        </div>
        <div className="nutri-objetivo">
          <span className="nutri-objetivo-label">Índice M.O.</span>
          <strong>Igual o superior a {objetivos.indice_musculo_oseo_objetivo ?? '—'}</strong>
        </div>
      </div>
    </div>
  )
}

function PieFraccionamiento({ evaluacion }) {
  const datos = MASAS.map((m) => ({ ...m, valor: Number(evaluacion[m.key]) || 0 })).filter((m) => m.valor > 0)
  const total = datos.reduce((acc, d) => acc + d.valor, 0) || 1

  const cx = 100
  const cy = 100
  const r = 90
  const polar = (angulo) => {
    const rad = ((angulo - 90) * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }

  let acumulado = 0
  const slices = datos.map((d) => {
    const desde = (acumulado / total) * 360
    acumulado += d.valor
    const hasta = (acumulado / total) * 360
    return { ...d, desde, hasta }
  })

  return (
    <div className="card nutri-grafico">
      <h4>Fraccionamiento de 5 masas</h4>
      <div className="nutri-pie-wrap">
        <svg viewBox="0 0 200 200" className="nutri-pie-svg" role="img" aria-label="Fraccionamiento de 5 masas corporales">
          {slices.length === 1 ? (
            <circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
          ) : (
            slices.map((s) => {
              const [x1, y1] = polar(s.desde)
              const [x2, y2] = polar(s.hasta)
              const largeArc = s.hasta - s.desde > 180 ? 1 : 0
              return (
                <path
                  key={s.key}
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
              )
            })
          )}
        </svg>
        <ul className="nutri-pie-legend">
          {datos.map((d) => (
            <li key={d.key}>
              <span className="nutri-dot" style={{ background: d.color }} />
              {d.etiqueta} <strong>{d.valor}%</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BarraGauge({ titulo, valor, min, max, zonas, unidad }) {
  const pct = (v) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))
  const valorNum = valor != null ? Number(valor) : null

  return (
    <div className="card nutri-grafico">
      <h4>{titulo}</h4>
      <div className="nutri-gauge-legend">
        {zonas.map((z) => (
          <span key={z.etiqueta} className="nutri-gauge-legend-item">
            <span className="nutri-dot" style={{ background: z.color }} />
            {z.etiqueta}
          </span>
        ))}
      </div>
      <div className="nutri-gauge-track">
        {zonas.map((z) => (
          <div
            key={z.etiqueta}
            className="nutri-gauge-zona"
            style={{ left: `${pct(z.desde)}%`, width: `${Math.max(0, pct(z.hasta) - pct(z.desde))}%`, background: z.color }}
          />
        ))}
        {valorNum != null && (
          <div className="nutri-gauge-marcador" style={{ left: `${pct(valorNum)}%` }}>
            <span className="nutri-gauge-marcador-etiqueta">
              {valorNum}
              {unidad || ''}
            </span>
          </div>
        )}
      </div>
      <div className="nutri-gauge-escala">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function CuadranteImoSuma6pl({ indiceMO, suma6pl, objetivoSuma6pl, objetivoIndiceMO }) {
  if (objetivoSuma6pl == null || objetivoIndiceMO == null) {
    return (
      <div className="card nutri-grafico nutri-grafico-ancho">
        <h4>Diagnóstico: Índice M.O. y Suma de 6 pliegues</h4>
        <p className="texto-muted">
          Para ver este gráfico hace falta configurar el objetivo de suma de 6 pliegues y el de índice músculo-óseo
          de la categoría.
        </p>
      </div>
    )
  }

  if (indiceMO == null || suma6pl == null) {
    return (
      <div className="card nutri-grafico nutri-grafico-ancho">
        <h4>Diagnóstico: Índice M.O. y Suma de 6 pliegues</h4>
        <p className="texto-muted">La última evaluación no tiene índice músculo-óseo o suma de 6 pliegues cargados.</p>
      </div>
    )
  }

  const margenX = 15
  const margenY = 0.6
  const xMin = Math.min(objetivoSuma6pl - margenX, suma6pl - margenX / 2)
  const xMax = Math.max(objetivoSuma6pl + margenX, suma6pl + margenX / 2)
  const yMin = Math.min(objetivoIndiceMO - margenY, indiceMO - margenY / 2)
  const yMax = Math.max(objetivoIndiceMO + margenY, indiceMO + margenY / 2)

  const w = 360
  const h = 240
  const pad = 40
  // Eje X invertido: la suma de 6 pliegues crece hacia la izquierda, así
  // que a la derecha (menos pliegues = menos grasa) queda la zona óptima.
  // Eje Y normal: el índice M.O. crece hacia arriba (más alto = mejor, a
  // diferencia del IMC que este gráfico reemplazó).
  const escalaX = (v) => pad + ((xMax - v) / (xMax - xMin)) * (w - pad * 2)
  const escalaY = (v) => h - pad - ((v - yMin) / (yMax - yMin)) * (h - pad * 2)

  const divisorX = escalaX(objetivoSuma6pl)
  const divisorY = escalaY(objetivoIndiceMO)
  const puntoX = escalaX(suma6pl)
  const puntoY = escalaY(indiceMO)

  return (
    <div className="card nutri-grafico nutri-grafico-ancho">
      <h4>Diagnóstico: Índice M.O. y Suma de 6 pliegues</h4>
      <svg viewBox={`0 0 ${w} ${h}`} className="nutri-cuadrante-svg" role="img" aria-label="Diagnóstico de índice músculo-óseo contra suma de 6 pliegues">
        <rect x={pad} y={pad} width={divisorX - pad} height={divisorY - pad} fill={COLOR_WARNING} opacity="0.22" />
        <rect x={divisorX} y={pad} width={w - pad - divisorX} height={divisorY - pad} fill={COLOR_GOOD} opacity="0.16" />
        <rect x={pad} y={divisorY} width={divisorX - pad} height={h - pad - divisorY} fill={COLOR_CRITICAL} opacity="0.2" />
        <rect x={divisorX} y={divisorY} width={w - pad - divisorX} height={h - pad - divisorY} fill={COLOR_WARNING} opacity="0.22" />

        <line x1={divisorX} y1={pad} x2={divisorX} y2={h - pad} stroke="var(--border)" strokeDasharray="4 3" />
        <line x1={pad} y1={divisorY} x2={w - pad} y2={divisorY} stroke="var(--border)" strokeDasharray="4 3" />

        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--text-muted)" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--text-muted)" />

        <text x={pad + 6} y={pad + 16} className="nutri-cuadrante-etiqueta">Bajar masa adiposa</text>
        <text x={w - pad - 6} y={pad + 16} textAnchor="end" className="nutri-cuadrante-etiqueta">Óptimo</text>
        <text x={pad + 6} y={h - pad - 8} className="nutri-cuadrante-etiqueta">Bajar MA / Subir MM</text>
        <text x={w - pad - 6} y={h - pad - 8} textAnchor="end" className="nutri-cuadrante-etiqueta">Subir masa muscular</text>

        <circle cx={puntoX} cy={puntoY} r="6" fill="var(--granate-700)" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="nutri-cuadrante-ejes">
        <span>Eje horizontal: Suma de 6 pliegues (mm) — menor valor hacia la derecha</span>
        <span>Eje vertical: Índice músculo-óseo — mayor valor hacia arriba</span>
      </div>
    </div>
  )
}
