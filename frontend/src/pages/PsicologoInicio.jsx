import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import './AdminJugadorDetalle.css'
import './Psicologia.css'

export default function PsicologoInicio() {
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api
      .get('/psicologia/mis-jugadores')
      .then(({ data }) => setJugadores(data))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="page">
      <div className="seccion-especializada-header">
        <h1>Mis jugadores</h1>
      </div>

      <div className="card seccion">
        {cargando && (
          <div className="empty-state">
            <span className="spinner spinner-dark" />
          </div>
        )}

        {!cargando && jugadores.length === 0 && (
          <p className="texto-muted">Todavía no tenés jugadores asignados.</p>
        )}

        {!cargando && jugadores.length > 0 && (
          <div className="mis-jugadores-lista">
            {jugadores.map((j) => (
              <Link key={j.id} to={`/psicologia/${j.id}`} className="mis-jugadores-item">
                {j.nombre} {j.apellido}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
