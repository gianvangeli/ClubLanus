import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import './BibliotecaJugadorDetalle.css'

export default function BibliotecaJugadorDetalle() {
  const { id } = useParams()
  const [publicacion, setPublicacion] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api
      .get(`/biblioteca/${id}`)
      .then(({ data }) => setPublicacion(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la publicación')))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <Link to="/biblioteca" className="btn btn-ghost btn-sm">
          ← Volver
        </Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/biblioteca" className="btn btn-ghost btn-sm">
        ← Volver a la biblioteca
      </Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>{publicacion.titulo}</h1>
          {publicacion.descripcion && <p>{publicacion.descripcion}</p>}
        </div>
      </div>

      {publicacion.videos.length === 0 && (
        <div className="empty-state card">
          <p>Esta publicación todavía no tiene videos cargados.</p>
        </div>
      )}

      <div className="video-list">
        {publicacion.videos.map((video) => (
          <VideoItem key={video.id} video={video} bibliotecaId={id} />
        ))}
      </div>
    </div>
  )
}

function VideoItem({ video, bibliotecaId }) {
  const videoRef = useRef(null)
  const abiertoRef = useRef(false)
  const intervaloRef = useRef(null)

  const registrarApertura = () => {
    if (abiertoRef.current) return
    abiertoRef.current = true
    api.post(`/biblioteca/${bibliotecaId}/abrir`).catch(() => {})
  }

  // segundos: si no se pasa (video <video> nativo), se toma de videoRef.
  const reportarProgreso = (segundosOCompleto, quizasCompleto) => {
    const segundos =
      typeof segundosOCompleto === 'number' ? segundosOCompleto : Math.floor(videoRef.current?.currentTime || 0)
    const completo = typeof segundosOCompleto === 'number' ? Boolean(quizasCompleto) : Boolean(segundosOCompleto)

    api
      .put(`/biblioteca/${bibliotecaId}/progreso`, { segundo_actual: segundos, completo })
      .catch(() => {})
  }

  const onPlay = () => {
    registrarApertura()
    if (intervaloRef.current) clearInterval(intervaloRef.current)
    intervaloRef.current = setInterval(() => reportarProgreso(false), 15000)
  }

  const onPause = () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current)
    reportarProgreso(false)
  }

  const onEnded = () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current)
    reportarProgreso(true)
  }

  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
  }, [])

  const token = localStorage.getItem('token')
  const idYouTube = video.tipo === 'link' ? extraerIdYouTube(video.url_video) : null

  return (
    <div className="video-item card">
      <div className="video-item-header">
        <h3>{video.titulo}</h3>
      </div>
      {video.descripcion && <p className="video-item-desc">{video.descripcion}</p>}

      {video.tipo === 'archivo' ? (
        <video
          ref={videoRef}
          className="video-player"
          controls
          preload="metadata"
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          src={`/api/biblioteca/videos/${video.id}/archivo?token=${token}`}
        />
      ) : idYouTube ? (
        <YouTubePlayer videoId={idYouTube} onAbrir={registrarApertura} onProgreso={reportarProgreso} />
      ) : (
        <a className="btn btn-primary" href={video.url_video} target="_blank" rel="noreferrer">
          Ver video externo ↗
        </a>
      )}
    </div>
  )
}
