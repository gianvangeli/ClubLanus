import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { formatFechaHora } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import './AdminJugadorDetalle.css'
import './JugadorVideos.css'

const VIDEO_VACIO = { titulo: '', descripcion: '', url_video: '' }

export default function JugadorVideos() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    Promise.all([api.get(`/jugadores/${id}`), api.get(`/jugadores/${id}/videos`)])
      .then(([resJugador, resVideos]) => {
        setJugador(resJugador.data)
        setVideos(resVideos.data)
      })
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la información')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [id])

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  const eliminar = async (videoId) => {
    if (!window.confirm('¿Eliminar este video?')) return
    try {
      await api.delete(`/jugadores/${id}/videos/${videoId}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el video'))
    }
  }

  return (
    <div className="page">
      <Link to={`/admin/jugadores/${id}`} className="btn btn-ghost btn-sm">
        ← Volver a la ficha
      </Link>

      <div className="seccion-especializada-header">
        <h1>Videos{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="videos" />
      </div>

      <p className="texto-muted" style={{ marginBottom: 16 }}>
        Videos personales y libres de este jugador, para que pueda verse a sí mismo. A diferencia de Biblioteca, no
        hace falta elegir a quién asignarlos: son siempre del jugador de esta ficha.
      </p>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <FormSubirVideo jugadorId={id} onSubido={cargar} />

      {cargando ? (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      ) : videos.length === 0 ? (
        <div className="card seccion empty-state">
          <p>Todavía no se subió ningún video individual.</p>
        </div>
      ) : (
        <div className="video-list" style={{ marginTop: 16 }}>
          {videos.map((v) => (
            <VideoItemStaff key={v.id} video={v} onEliminar={() => eliminar(v.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FormSubirVideo({ jugadorId, onSubido }) {
  const [modo, setModo] = useState('archivo')
  const [form, setForm] = useState(VIDEO_VACIO)
  const [archivo, setArchivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      if (modo === 'archivo') {
        if (!archivo) {
          setError('Elegí un archivo de video')
          setEnviando(false)
          return
        }
        const datos = new FormData()
        datos.append('titulo', form.titulo)
        if (form.descripcion) datos.append('descripcion', form.descripcion)
        datos.append('video', archivo)
        await api.post(`/jugadores/${jugadorId}/videos`, datos)
      } else {
        await api.post(`/jugadores/${jugadorId}/videos`, form)
      }
      setForm(VIDEO_VACIO)
      setArchivo(null)
      onSubido()
    } catch (err) {
      setError(extraerError(err, 'No se pudo subir el video'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion" style={{ marginBottom: 16 }}>
      <h3>Subir video</h3>

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

      {error && <div className="alert alert-error">{error}</div>}

      <form className="form-video" onSubmit={onSubmit}>
        <div className="field">
          <label>Título</label>
          <input value={form.titulo} onChange={onChange('titulo')} required />
        </div>
        <div className="field">
          <label>Descripción</label>
          <input value={form.descripcion} onChange={onChange('descripcion')} />
        </div>

        {modo === 'link' && (
          <div className="field">
            <label>URL del video</label>
            <input value={form.url_video} onChange={onChange('url_video')} placeholder="https://..." required />
          </div>
        )}

        {modo === 'archivo' && (
          <div className="field">
            <label>Archivo de video</label>
            <input type="file" accept="video/*" onChange={(e) => setArchivo(e.target.files[0])} />
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Subir video'}
        </button>
      </form>
    </div>
  )
}

function VideoItemStaff({ video, onEliminar }) {
  const token = localStorage.getItem('token')
  const idYouTube = video.tipo === 'link' ? extraerIdYouTube(video.url_video) : null

  return (
    <div className="video-item card">
      <div className="video-item-header">
        <h3>{video.titulo}</h3>
        <button className="btn btn-ghost btn-sm btn-danger" type="button" onClick={onEliminar}>
          Eliminar
        </button>
      </div>
      {video.descripcion && <p className="video-item-desc">{video.descripcion}</p>}
      <p className="texto-muted" style={{ fontSize: 12 }}>Subido {formatFechaHora(video.creado_en)}</p>

      {video.tipo === 'archivo' ? (
        <video
          className="video-player"
          controls
          preload="metadata"
          src={`${API_BASE}/api/jugadores/videos/${video.id}/archivo?token=${token}`}
        />
      ) : idYouTube ? (
        <YouTubePlayer videoId={idYouTube} />
      ) : (
        <a className="btn btn-primary" href={video.url_video} target="_blank" rel="noreferrer">
          Ver video externo ↗
        </a>
      )}
    </div>
  )
}
