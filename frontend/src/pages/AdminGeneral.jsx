import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import './AdminGeneral.css'

// Mismas 6 áreas especializadas de la ficha del jugador. Cada una linkea
// directo a su página para poder entrar con un clic desde el resumen.
const AREAS = [
  { key: 'nutricion', etiqueta: 'Nutrición', ruta: (id) => `/admin/jugadores/${id}/nutricion` },
  { key: 'lesiones', etiqueta: 'Lesiones', ruta: (id) => `/admin/jugadores/${id}/lesiones` },
  { key: 'psicologia', etiqueta: 'Psicología', ruta: (id) => `/admin/jugadores/${id}/psicologia` },
  { key: 'preparacion_fisica', etiqueta: 'Preparación física', ruta: (id) => `/admin/jugadores/${id}/preparacion-fisica` },
  { key: 'analisis_futbolistico', etiqueta: 'Análisis futbolístico', ruta: (id) => `/admin/jugadores/${id}/analisis-futbolistico` },
  { key: 'datos_bigdata', etiqueta: 'Datos (Big Data)', ruta: (id) => `/admin/jugadores/${id}/datos` },
]

const ESTADO_INFO = {
  good: { color: '#0ca30c', dot: '🟢' },
  warning: { color: '#fab219', dot: '🟡' },
  critical: { color: '#d03b3b', dot: '🔴' },
  sin_datos: { color: '#9aa0a6', dot: '⚪' },
}

export default function AdminGeneral() {
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/general')
      .then(({ data }) => setJugadores(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el resumen general')))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>General</h1>
          <p>Estado del plantel por área, según lo que ya se carga en cada módulo. Se actualiza solo.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && jugadores.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no hay jugadores cargados.</p>
        </div>
      )}

      {!cargando && jugadores.length > 0 && (
        <>
          <div className="tabla-scroll">
            <table className="tabla tabla-compacta gral-tabla">
              <thead>
                <tr>
                  <th>Jugador</th>
                  {AREAS.map((a) => (
                    <th key={a.key}>{a.etiqueta}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link to={`/admin/jugadores/${j.id}`} className="gral-jugador">
                        <strong>
                          {j.apellido}, {j.nombre}
                        </strong>
                        <span className="texto-muted">{j.categoria || j.posicion || '—'}</span>
                      </Link>
                    </td>
                    {AREAS.map((a) => {
                      const info = j.areas[a.key]
                      const estado = ESTADO_INFO[info.estado] || ESTADO_INFO.sin_datos
                      return (
                        <td key={a.key}>
                          <Link to={a.ruta(j.id)} className="gral-chip" title={info.etiqueta}>
                            <span className="gral-dot" style={{ background: estado.color }} />
                            <span className="gral-chip-texto">{info.etiqueta}</span>
                          </Link>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="gral-leyenda">
            <span>
              <span className="gral-dot" style={{ background: ESTADO_INFO.good.color }} /> Bien
            </span>
            <span>
              <span className="gral-dot" style={{ background: ESTADO_INFO.warning.color }} /> Atención
            </span>
            <span>
              <span className="gral-dot" style={{ background: ESTADO_INFO.critical.color }} /> Crítico
            </span>
            <span>
              <span className="gral-dot" style={{ background: ESTADO_INFO.sin_datos.color }} /> Sin datos
            </span>
          </div>
        </>
      )}
    </div>
  )
}
