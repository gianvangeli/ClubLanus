import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'

const etiquetaCarga = (carga) => {
  const f = new Date(carga.fecha)
  const dia = `${String(f.getUTCDate()).padStart(2, '0')}/${String(f.getUTCMonth() + 1).padStart(2, '0')}`
  return `Cargas físicas día ${dia}` + (carga.titulo ? ` (${carga.titulo})` : '')
}

export default function JugadorCargasFisicas() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)

  useEffect(() => {
    api.get(`/jugadores/${id}`).then(({ data }) => setJugador(data))
  }, [id])

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  return (
    <div className="page">
      <Link to={`/admin/jugadores/${id}`} className="btn btn-ghost btn-sm">
        ← Volver a la ficha
      </Link>

      <div className="seccion-especializada-header">
        <h1>Cargas físicas{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="cargas-fisicas" />
      </div>

      <CargasFisicas jugadorId={id} />
    </div>
  )
}

function CargasFisicas({ jugadorId }) {
  const [cargas, setCargas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fecha, setFecha] = useState('')
  const [titulo, setTitulo] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/cargas-fisicas`)
      .then(({ data }) => setCargas(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!archivo) {
      setError('Elegí un archivo PDF')
      return
    }

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', fecha || new Date().toISOString().slice(0, 10))
      if (titulo) datos.append('titulo', titulo)
      datos.append('archivo', archivo)
      await api.post(`/jugadores/${jugadorId}/cargas-fisicas`, datos)
      setFecha('')
      setTitulo('')
      setArchivo(null)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo subir el PDF'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (carga) => {
    if (!window.confirm(`¿Eliminar "${etiquetaCarga(carga)}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${jugadorId}/cargas-fisicas/${carga.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la carga física'))
    }
  }

  const token = localStorage.getItem('token')

  return (
    <div className="card seccion cargas-fisicas-card">
      <h3>Cargas Físicas</h3>

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && cargas.length === 0 && (
        <p className="texto-muted">Todavía no hay cargas físicas subidas para este jugador.</p>
      )}

      {!cargando && cargas.length > 0 && (
        <div className="cf-lista">
          {cargas.map((c) => (
            <div className="cf-item" key={c.id}>
              <div className="cf-item-info">
                <strong>{etiquetaCarga(c)}</strong>
                <span className="texto-muted">
                  {new Date(c.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="cf-item-acciones">
                <a
                  className="btn btn-ghost btn-sm"
                  href={`${API_BASE}/api/jugadores/${jugadorId}/cargas-fisicas/${c.id}/archivo?token=${token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver PDF ↗
                </a>
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(c)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="divisor" />

      {error && <div className="alert alert-error">{error}</div>}

      <form className="form-video" onSubmit={onSubmit}>
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="field">
          <label>Aclaración (opcional)</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: partido, doble turno, recuperación"
          />
        </div>
        <div className="field">
          <label>Archivo PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files[0] || null)} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Subir carga física'}
        </button>
      </form>
    </div>
  )
}
