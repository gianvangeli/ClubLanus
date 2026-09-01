import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import { agruparPorCategoria } from '../utils/agrupar'
import './PreparacionFisica.css'
import './EstadisticasPartido.css'

export default function EstadisticasPartidoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [partido, setPartido] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    api
      .get(`/estadisticas-partido/${id}`)
      .then(({ data }) => setPartido(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el partido')))
      .finally(() => setCargando(false))
  }, [id])

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar las estadísticas del partido vs ${partido.rival}?`)) return
    try {
      await api.delete(`/estadisticas-partido/${id}`)
      navigate('/admin/estadisticas-partido')
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el partido'))
    }
  }

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error && !partido) {
    return (
      <div className="page">
        <Link to="/admin/estadisticas-partido" className="btn btn-ghost btn-sm">
          ← Volver
        </Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      </div>
    )
  }

  const token = localStorage.getItem('token')

  return (
    <div className="page">
      <Link to="/admin/estadisticas-partido" className="btn btn-ghost btn-sm">
        ← Volver a Estadísticas de partido
      </Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>vs {partido.rival}</h1>
          <p>
            {formatFecha(partido.fecha)}
            {partido.competencia ? ` · ${partido.competencia}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {partido.condicion && <span className="badge">{partido.condicion === 'local' ? 'Local' : 'Visitante'}</span>}
          {partido.resultado && <span className="badge badge-success">{partido.resultado}</span>}
          {partido.tiene_archivo && (
            <a
              className="btn btn-ghost btn-sm"
              href={`${API_BASE}/api/estadisticas-partido/${id}/archivo?token=${token}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver PDF original ↗
            </a>
          )}
          <button className="btn btn-ghost btn-sm btn-danger" onClick={eliminar}>
            Eliminar
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card seccion" style={{ marginBottom: 16 }}>
        <h3>Estadísticas de equipo</h3>
        {agruparPorCategoria(partido.equipo).map(({ categoria, items }) => (
          <div key={categoria} className="pf-categoria">
            <h4>{categoria}</h4>
            <div className="ep-tabla-scroll">
              <table className="tabla pf-tabla-comparacion">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Lanús</th>
                    <th>Rival</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.indicador}</td>
                      <td>{item.valor_lanus ?? '—'}</td>
                      <td>{item.valor_rival ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="card seccion">
        <h3>Estadísticas por jugador</h3>
        {partido.jugadores.length === 0 && (
          <p className="texto-muted">No hay estadísticas por jugador cargadas para este partido.</p>
        )}
        <div className="pf-picos-lista">
          {partido.jugadores.map((j) => (
            <div key={j.id} className="pf-pico-item">
              <div className="pf-pico-header">
                <strong>
                  {j.nombre} {j.apellido}
                </strong>
                {j.posicion && <span className="texto-muted">{j.posicion}</span>}
              </div>
              <div className="pf-pico-categorias">
                {agruparPorCategoria(j.indicadores).map(({ categoria, items }) => (
                  <div key={categoria} className="pf-pico-categoria">
                    <h5>{categoria}</h5>
                    <div className="pf-pico-indicadores">
                      {items.map((ind, i) => (
                        <span key={i} className="pf-indicador-chip">
                          {ind.indicador}: <strong>{ind.valor}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
