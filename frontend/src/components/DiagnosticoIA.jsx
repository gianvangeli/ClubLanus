import { useEffect, useState } from 'react'
import api, { extraerError } from '../api/client'
import { formatFechaHora } from '../utils/fecha'
import './DiagnosticoIA.css'

// Diagnóstico con IA de un área puntual (nutrición, lesiones, ...) de un
// jugador. Para sumar esta opción a una nueva área, se agrega esta pieza a
// la página de esa área con su `area` correspondiente (tiene que existir
// también en backend/src/controllers/diagnosticoIaController.js) y una
// `descripcion` que explique qué datos usa.
export default function DiagnosticoIA({ jugadorId, area, titulo = 'Diagnóstico con IA', descripcion }) {
  const [diagnosticos, setDiagnosticos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/diagnostico-ia/${area}`)
      .then(({ data }) => setDiagnosticos(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId, area])

  const generar = async () => {
    setError('')
    setGenerando(true)
    try {
      await api.post(`/jugadores/${jugadorId}/diagnostico-ia/${area}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo generar el diagnóstico'))
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="card seccion dia-card">
      <div className="seccion-header">
        <h3>{titulo}</h3>
        <button className="btn btn-primary btn-sm" onClick={generar} disabled={generando}>
          {generando ? <span className="spinner" /> : '+ Generar diagnóstico IA'}
        </button>
      </div>

      {descripcion && (
        <p className="texto-muted" style={{ marginBottom: 12 }}>
          {descripcion}
        </p>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && diagnosticos.length === 0 && (
        <p className="texto-muted">Todavía no se generó ningún diagnóstico para esta área.</p>
      )}

      {!cargando && diagnosticos.length > 0 && (
        <div className="dia-lista">
          {diagnosticos.map((d) => (
            <div key={d.id} className="dia-item">
              <div className="dia-item-header">
                <strong>{formatFechaHora(d.creado_en)}</strong>
              </div>
              <p className="dia-item-texto">{d.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
