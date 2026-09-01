import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import ImportarEstadisticasPartidoPanel from '../components/ImportarEstadisticasPartidoPanel'
import './EstadisticasPartido.css'

export default function EstadisticasPartido() {
  const [partidos, setPartidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get('/estadisticas-partido')
      .then(({ data }) => setPartidos(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la lista de partidos')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const eliminar = async (partido) => {
    if (!window.confirm(`¿Eliminar las estadísticas del partido vs ${partido.rival} (${formatFecha(partido.fecha)})?`)) {
      return
    }
    try {
      await api.delete(`/estadisticas-partido/${partido.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el partido'))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Estadísticas de partido</h1>
          <p>Informes tácticos importados por IA (formato Wyscout): estadísticas de equipo y por jugador.</p>
        </div>
      </div>

      <div className="card seccion" style={{ marginBottom: 16 }}>
        <h3>Importar informe de partido</h3>
        <ImportarEstadisticasPartidoPanel onImportado={cargar} />
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && partidos.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no importaste ningún partido.</p>
        </div>
      )}

      <div className="ep-lista">
        {partidos.map((p) => (
          <div className="ep-partido-fila card" key={p.id}>
            <Link to={`/admin/estadisticas-partido/${p.id}`} className="ep-partido-row">
              <div>
                <h3>vs {p.rival}</h3>
                <p className="texto-muted">
                  {formatFecha(p.fecha)}
                  {p.competencia ? ` · ${p.competencia}` : ''}
                </p>
              </div>
              <div className="ep-partido-row-meta">
                {p.condicion && <span className="badge">{p.condicion === 'local' ? 'Local' : 'Visitante'}</span>}
                {p.resultado && <span className="badge badge-success">{p.resultado}</span>}
              </div>
            </Link>
            <button className="ep-partido-eliminar" title="Eliminar partido" onClick={() => eliminar(p)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
