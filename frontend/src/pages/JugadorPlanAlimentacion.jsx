import { useEffect, useState } from 'react'
import api, { API_BASE, extraerError } from '../api/client'
import VistaPlanAlimentacion from '../components/VistaPlanAlimentacion'

export default function JugadorPlanAlimentacion() {
  const [dieta, setDieta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  useEffect(() => {
    api
      .get('/jugadores/mi-plan-alimentacion')
      .then(({ data }) => setDieta(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar tu plan de alimentación')))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Plan de alimentación individual</h1>
          <p>El plan armado por el departamento de nutrición para vos.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && !error && (
        <div className="card seccion">
          <VistaPlanAlimentacion
            dieta={dieta}
            archivoHref={dieta?.jugador_id ? `${API_BASE}/api/jugadores/${dieta.jugador_id}/dieta/archivo?token=${token}` : ''}
          />
        </div>
      )}
    </div>
  )
}
