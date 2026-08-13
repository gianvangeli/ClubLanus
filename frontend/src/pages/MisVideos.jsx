import { useEffect, useState } from 'react'
import api, { API_BASE, extraerError } from '../api/client'
import { formatFechaHora } from '../utils/fecha'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import './MisVideos.css'

export default function MisVideos() {
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/jugadores/mis-videos')
      .then(({ data }) => setVideos(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar tus videos')))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Mis videos</h1>
          <p>Videos personales que subió el cuerpo técnico para vos</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && videos.length === 0 && !error && (
        <div className="empty-state card">
          <p>Todavía no tenés videos individuales cargados.</p>
        </div>
      )}

      <div className="video-list">
        {videos.map((v) => (
          <VideoItem key={v.id} video={v} />
        ))}
      </div>
    </div>
  )
}

function VideoItem({ video }) {
  const token = localStorage.getItem('token')
  const idYouTube = video.tipo === 'link' ? extraerIdYouTube(video.url_video) : null

  return (
    <div className="video-item card">
      <div className="video-item-header">
        <h3>{video.titulo}</h3>
      </div>
      {video.descripcion && <p className="video-item-desc">{video.descripcion}</p>}
      <p className="texto-muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Subido {formatFechaHora(video.creado_en)}
      </p>

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
