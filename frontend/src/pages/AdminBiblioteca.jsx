import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import './AdminBiblioteca.css'

export default function AdminBiblioteca() {
  const [publicaciones, setPublicaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('analisis')
  const [creando, setCreando] = useState(false)

  const cargar = () => {
    setCargando(true)
    api
      .get('/biblioteca/admin')
      .then(({ data }) => setPublicaciones(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la biblioteca')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const eliminar = async (publicacion) => {
    if (!window.confirm(`¿Eliminar la publicación "${publicacion.titulo}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await api.delete(`/biblioteca/${publicacion.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la publicación'))
    }
  }

  const crearPublicacion = async (e) => {
    e.preventDefault()
    setCreando(true)
    setError('')
    try {
      await api.post('/biblioteca', { titulo, descripcion, tipo })
      setTitulo('')
      setDescripcion('')
      setTipo('analisis')
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo crear la publicación'))
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Biblioteca</h1>
        </div>
      </div>

      <form className="card nueva-publicacion" onSubmit={crearPublicacion}>
        <div className="field">
          <label>Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="field">
          <label>Tipo</label>
          <div className="modo-toggle">
            <button
              type="button"
              className={`btn btn-sm ${tipo === 'analisis' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTipo('analisis')}
            >
              Análisis
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tipo === 'partido' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTipo('partido')}
            >
              Partido
            </button>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={creando}>
          {creando ? <span className="spinner" /> : 'Nueva publicación'}
        </button>
      </form>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && publicaciones.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no creaste ninguna publicación.</p>
        </div>
      )}

      <div className="publicaciones-list">
        {publicaciones.map((p) => (
          <div className="publicacion-fila card" key={p.id}>
            <Link to={`/admin/biblioteca/${p.id}`} className="publicacion-row">
              <div>
                <h3>{p.titulo}</h3>
                {p.descripcion && <p>{p.descripcion}</p>}
              </div>
              <div className="publicacion-row-meta">
                <span className="badge">
                  {p.tipo === 'analisis' ? 'Análisis' : 'Partido'}
                  {p.analisis_tipo ? ` · ${p.analisis_tipo === 'rival' ? 'rival' : 'propio'}` : ''}
                </span>
                <span className={`badge ${p.estado === 'publicado' ? 'badge-success' : 'badge-warning'}`}>
                  {p.estado}
                </span>
                <span>{p.cantidad_videos} video(s)</span>
                <span>{p.cantidad_jugadores} jugador(es)</span>
              </div>
            </Link>
            <button
              className="publicacion-eliminar"
              title="Eliminar publicación"
              onClick={() => eliminar(p)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
