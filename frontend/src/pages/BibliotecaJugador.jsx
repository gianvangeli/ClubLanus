import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import './BibliotecaJugador.css'

export default function BibliotecaJugador() {
  const [publicaciones, setPublicaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/biblioteca')
      .then(({ data }) => setPublicaciones(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la biblioteca')))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Biblioteca</h1>
          <p>Videos e informes que el cuerpo técnico compartió con vos</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && publicaciones.length === 0 && !error && (
        <div className="empty-state card">
          <p>Todavía no tenés publicaciones asignadas.</p>
        </div>
      )}

      <div className="biblio-grid">
        {publicaciones.map((p) => (
          <Link to={`/biblioteca/${p.id}`} className="biblio-card card" key={p.id}>
            <div className="biblio-card-thumb">▶</div>
            <div className="biblio-card-body">
              <h3>{p.titulo}</h3>
              {p.descripcion && <p>{p.descripcion}</p>}
              <span className="biblio-card-fecha">
                {new Date(p.fecha_publicacion).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
