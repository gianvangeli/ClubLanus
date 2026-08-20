import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFechaHora } from '../utils/fecha'
import './DiagnosticoIA.css'

// Diagnóstico con IA de un área puntual (nutrición, lesiones, ...) de un
// jugador. Para sumar esta opción a una nueva área, se agrega esta pieza a
// la página de esa área con su `area` correspondiente (tiene que existir
// también en backend/src/controllers/diagnosticoIaController.js) y una
// `descripcion` que explique qué datos usa.
//
// `soloLectura`: este patrón (informe aislado por área) quedó reemplazado
// por el Asistente IA (ver JugadorAsistenteIA.jsx), que cruza todas las
// áreas del jugador. Con soloLectura=true se sigue mostrando el historial
// viejo, pero no se pueden generar diagnósticos nuevos: en su lugar se
// muestra un link al Asistente IA.
export default function DiagnosticoIA({ jugadorId, area, titulo = 'Diagnóstico con IA', descripcion, soloLectura = false }) {
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
        {soloLectura ? (
          <Link to={`/admin/jugadores/${jugadorId}/asistente-ia`} className="btn btn-ghost btn-sm">
            Ir al Asistente IA →
          </Link>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={generar} disabled={generando}>
            {generando ? <span className="spinner" /> : '+ Generar diagnóstico IA'}
          </button>
        )}
      </div>

      {soloLectura && (
        <p className="texto-muted" style={{ marginBottom: 12 }}>
          Este historial quedó como archivo de solo lectura. Las consultas nuevas se hacen desde el{' '}
          <Link to={`/admin/jugadores/${jugadorId}/asistente-ia`}>Asistente IA</Link>, que cruza esta área con el
          resto de los datos del jugador.
        </p>
      )}

      {!soloLectura && descripcion && (
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
