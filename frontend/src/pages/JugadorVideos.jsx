import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import YouTubePlayer from '../components/YouTubePlayer'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import { extraerIdYouTube } from '../utils/youtube'
import './AdminJugadorDetalle.css'

export default function JugadorVideos() {
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
        <h1>Videos{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="videos" />
      </div>

      <VideosJugador jugadorId={id} />
    </div>
  )
}

function VideosJugador({ jugadorId }) {
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modo, setModo] = useState('archivo')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [urlVideo, setUrlVideo] = useState('')
  const [archivos, setArchivos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/videos`)
      .then(({ data }) => setVideos(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      if (modo === 'archivo') {
        if (archivos.length === 0) {
          setError('Elegí uno o más archivos de video')
          setEnviando(false)
          return
        }
        const datos = new FormData()
        if (titulo) datos.append('titulo', titulo)
        datos.append('descripcion', descripcion)
        archivos.forEach((archivo) => datos.append('videos', archivo))
        await api.post(`/jugadores/${jugadorId}/videos`, datos)
      } else {
        if (!urlVideo.trim()) {
          setError('Pegá al menos un link de video')
          setEnviando(false)
          return
        }
        await api.post(`/jugadores/${jugadorId}/videos`, {
          titulo: titulo || undefined,
          descripcion,
          url_video: urlVideo,
        })
      }
      setTitulo('')
      setDescripcion('')
      setUrlVideo('')
      setArchivos([])
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo agregar el video'))
    } finally {
      setEnviando(false)
    }
  }

  const token = localStorage.getItem('token')

  return (
    <div className="card seccion">
      <h3>Videos</h3>

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && videos.length === 0 && (
        <p className="texto-muted">Todavía no hay videos cargados para este jugador.</p>
      )}

      <div className="video-jugador-lista">
        {videos.map((v) => (
          <div className="video-jugador-item" key={v.id}>
            <div className="video-jugador-item-header">
              <strong>{v.titulo}</strong>
              <span className="badge badge-warning">{v.tipo === 'archivo' ? 'Archivo' : 'Link'}</span>
            </div>
            {v.descripcion && <p className="texto-muted">{v.descripcion}</p>}
            {v.tipo === 'archivo' ? (
              <video className="video-player" controls preload="metadata" src={`${API_BASE}/api/biblioteca/videos/${v.id}/archivo?token=${token}`} />
            ) : extraerIdYouTube(v.url_video) ? (
              <YouTubePlayer videoId={extraerIdYouTube(v.url_video)} />
            ) : (
              <a className="btn btn-ghost btn-sm" href={v.url_video} target="_blank" rel="noreferrer">
                Ver video externo ↗
              </a>
            )}
          </div>
        ))}
      </div>

      <hr className="divisor" />

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
          <label>Título {modo === 'archivo' ? '(opcional si subís varios)' : '(opcional)'}</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={modo === 'archivo' ? 'Se usa el nombre del archivo si lo dejás vacío' : 'Se usa el link si lo dejás vacío'}
          />
        </div>
        <div className="field">
          <label>Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        {modo === 'archivo' ? (
          <div className="field" key="archivo">
            <label>Archivos de video (cualquier formato, podés elegir varios)</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => setArchivos(Array.from(e.target.files))}
            />
            {archivos.length > 0 && (
              <span className="texto-muted">{archivos.length} archivo(s) seleccionado(s)</span>
            )}
          </div>
        ) : (
          <div className="field" key="link">
            <label>URLs del video (una por línea si son varios)</label>
            <textarea
              rows={3}
              value={urlVideo}
              onChange={(e) => setUrlVideo(e.target.value)}
              placeholder={'https://...\nhttps://...'}
            />
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Agregar video'}
        </button>
      </form>
    </div>
  )
}
