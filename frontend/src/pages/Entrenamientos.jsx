import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { extraerError } from '../api/client'
import './Entrenamientos.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function Entrenamientos() {
  const { esCuerpoTecnico } = useAuth()
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})

  const cargar = () => {
    setCargando(true)
    api
      .get('/entrenamientos')
      .then(({ data }) => setSesiones(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la agenda de entrenamientos')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const alternar = (id) => {
    if (abierta === id) {
      setAbierta(null)
      return
    }
    setAbierta(id)
    if (!detalles[id]) {
      setDetalles((prev) => ({ ...prev, [id]: { cargando: true, videos: [] } }))
      api
        .get(`/entrenamientos/${id}`)
        .then(({ data }) => setDetalles((prev) => ({ ...prev, [id]: { cargando: false, videos: data.videos } })))
        .catch(() => setDetalles((prev) => ({ ...prev, [id]: { cargando: false, videos: [], error: true } })))
    }
  }

  const eliminarSesion = async (id) => {
    if (!window.confirm('¿Eliminar esta sesión y todos sus videos? Esta acción no se puede deshacer.')) {
      return
    }
    try {
      await api.delete(`/entrenamientos/${id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la sesión'))
    }
  }

  const eliminarVideo = async (sesionId, videoId) => {
    if (!window.confirm('¿Eliminar este video?')) return
    try {
      await api.delete(`/entrenamientos/videos/${videoId}`)
      setDetalles((prev) => ({
        ...prev,
        [sesionId]: { ...prev[sesionId], videos: prev[sesionId].videos.filter((v) => v.id !== videoId) },
      }))
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el video'))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Entrenamientos</h1>
          <p>Agenda de videos por día — visible para todo el plantel</p>
        </div>
      </div>

      {esCuerpoTecnico && <NuevaSesion onCreado={cargar} />}

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && sesiones.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no hay entrenamientos cargados.</p>
        </div>
      )}

      <div className="entren-lista">
        {sesiones.map((s) => (
          <div className="card entren-sesion" key={s.id}>
            <button className="entren-sesion-header" onClick={() => alternar(s.id)}>
              <div className="entren-sesion-fecha">
                {new Date(s.fecha).toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div className="entren-sesion-meta">
                {s.descripcion && <span className="texto-muted">{s.descripcion}</span>}
                <span className="entren-count-chip">{s.cantidad_videos} video(s)</span>
                <span className="entren-chevron">{abierta === s.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {abierta === s.id && (
              <div className="entren-sesion-body">
                {detalles[s.id]?.cargando && (
                  <div className="empty-state">
                    <span className="spinner spinner-dark" />
                  </div>
                )}

                {!detalles[s.id]?.cargando && detalles[s.id]?.videos.length === 0 && (
                  <p className="texto-muted">Esta sesión no tiene videos.</p>
                )}

                <div className="entren-videos">
                  {detalles[s.id]?.videos.map((v) => (
                    <VideoEntrenamiento
                      key={v.id}
                      video={v}
                      puedeEliminar={esCuerpoTecnico}
                      onEliminar={() => eliminarVideo(s.id, v.id)}
                    />
                  ))}
                </div>

                {esCuerpoTecnico && (
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminarSesion(s.id)}>
                    Eliminar sesión completa
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoEntrenamiento({ video, puedeEliminar, onEliminar }) {
  const token = localStorage.getItem('token')

  return (
    <div className="entren-video-item">
      <div className="entren-video-item-header">
        <strong>{video.titulo}</strong>
        {puedeEliminar && (
          <button className="btn btn-ghost btn-sm btn-danger" onClick={onEliminar}>
            Eliminar
          </button>
        )}
      </div>
      {video.tipo === 'archivo' ? (
        <video
          className="video-player"
          controls
          preload="metadata"
          src={`/api/entrenamientos/videos/${video.id}/archivo?token=${token}`}
        />
      ) : (
        <a className="btn btn-ghost btn-sm" href={video.url_video} target="_blank" rel="noreferrer">
          Ver video externo ↗
        </a>
      )}
    </div>
  )
}

function NuevaSesion({ onCreado }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [descripcion, setDescripcion] = useState('')
  const [titulo, setTitulo] = useState('')
  const [modo, setModo] = useState('archivo')
  const [archivos, setArchivos] = useState([])
  const [urlVideo, setUrlVideo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    if (modo === 'archivo' && archivos.length === 0) {
      setError('Elegí uno o más archivos de video')
      return
    }
    if (modo === 'link' && !urlVideo.trim()) {
      setError('Pegá al menos un link de video')
      return
    }

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', fecha)
      if (descripcion) datos.append('descripcion', descripcion)
      if (titulo) datos.append('titulo', titulo)
      if (modo === 'archivo') {
        archivos.forEach((archivo) => datos.append('videos', archivo))
      } else {
        datos.append('url_video', urlVideo)
      }

      await api.post('/entrenamientos', datos)
      setMensaje('Video(s) agregado(s) correctamente')
      setDescripcion('')
      setTitulo('')
      setArchivos([])
      setUrlVideo('')
      onCreado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo subir el video'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card entren-form" onSubmit={onSubmit}>
      <h3>Subir video del día</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="entren-form-row">
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Descripción de la sesión (opcional)</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Semanita de impacto — sesión de velocidad"
          />
        </div>
      </div>

      <div className="modo-toggle">
        <button
          type="button"
          className={`btn btn-sm ${modo === 'archivo' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setModo('archivo')}
        >
          Subir archivo
        </button>
        <button
          type="button"
          className={`btn btn-sm ${modo === 'link' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setModo('link')}
        >
          Link externo
        </button>
      </div>

      <div className="field">
        <label>Título del video {modo === 'archivo' ? '(opcional si subís varios)' : '(opcional)'}</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={modo === 'archivo' ? 'Se usa el nombre del archivo si lo dejás vacío' : 'Se usa el link si lo dejás vacío'}
        />
      </div>

      {modo === 'archivo' ? (
        <div className="field">
          <label>Archivos de video (podés elegir uno o dos)</label>
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => setArchivos(Array.from(e.target.files))}
          />
          {archivos.length > 0 && <span className="texto-muted">{archivos.length} archivo(s) seleccionado(s)</span>}
        </div>
      ) : (
        <div className="field">
          <label>URLs del video (una por línea si son varios)</label>
          <textarea
            rows={2}
            value={urlVideo}
            onChange={(e) => setUrlVideo(e.target.value)}
            placeholder={'https://...\nhttps://...'}
          />
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Subir video'}
      </button>
    </form>
  )
}
