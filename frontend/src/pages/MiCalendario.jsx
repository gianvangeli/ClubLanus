import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import './Calendario.css'

export default function MiCalendario() {
  const [microciclos, setMicrociclos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/calendario/jugador')
      .then(({ data }) => setMicrociclos(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar las semanas')))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Calendario</h1>
      </div>
      <p className="texto-muted">Planificación semanal cargada por el cuerpo técnico.</p>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && microciclos.length === 0 && !error && (
        <div className="empty-state card" style={{ marginTop: 16 }}>
          <p>Todavía no hay semanas cargadas.</p>
        </div>
      )}

      {!cargando && microciclos.length > 0 && (
        <div className="cal-lista">
          {microciclos.map((m) => (
            <div key={m.id} className="card cal-item">
              <Link to={`/calendario/${m.id}`} className="cal-item-link">
                <strong>{m.nombre || 'Semana'}</strong>
                <span className="texto-muted">
                  {formatFecha(m.fecha_inicio)} al {formatFecha(m.fecha_fin)}
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
