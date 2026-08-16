import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { API_BASE, extraerError } from '../api/client'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import { formatFecha } from '../utils/fecha'
import EjerciciosTacticos from './EjerciciosTacticos'
import './Entrenamientos.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export const tituloSesion = (fecha) => `Entrenamiento del ${formatFecha(fecha)}`

const ETIQUETAS_ACCESO = {
  sin_solicitud: 'Sin pedir acceso',
  pendiente: 'Solicitud pendiente',
  aprobado: 'Acceso aprobado',
  rechazado: 'Solicitud rechazada',
}

export default function Entrenamientos() {
  const { esCuerpoTecnico } = useAuth()
  const [vista, setVista] = useState('agenda')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Entrenamientos</h1>
          <p>
            {esCuerpoTecnico
              ? 'Agenda de videos por día y entrenamientos desglosados (uso interno del cuerpo técnico)'
              : 'Agenda de videos por día — pedí acceso a cada sesión para poder verla'}
          </p>
        </div>
      </div>

      {esCuerpoTecnico && (
        <div className="entren-tabs">
          <button
            className={`btn btn-sm ${vista === 'agenda' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setVista('agenda')}
          >
            Agenda diaria
          </button>
          <button
            className={`btn btn-sm ${vista === 'desglosados' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setVista('desglosados')}
          >
            Entrenamientos desglosados
          </button>
        </div>
      )}

      {!esCuerpoTecnico || vista === 'agenda' ? <AgendaDiaria /> : <EjerciciosTacticos />}
    </div>
  )
}

function AgendaDiaria() {
  const { esCuerpoTecnico } = useAuth()
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get('/entrenamientos')
      .then(({ data }) => setSesiones(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la agenda de entrenamientos')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

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

  return (
    <div>
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
            <Link to={`/entrenamientos/${s.id}`} className="entren-sesion-header">
              <div className="entren-sesion-fecha">
                <strong>{tituloSesion(s.fecha)}</strong>
              </div>
              <div className="entren-sesion-meta">
                {esCuerpoTecnico && s.solicitudes_pendientes > 0 && (
                  <span className="entren-chip-acceso entren-chip-pendiente">
                    {s.solicitudes_pendientes} solicitud(es)
                  </span>
                )}
                {!esCuerpoTecnico && (
                  <span className={`entren-chip-acceso entren-chip-${s.acceso}`}>
                    {ETIQUETAS_ACCESO[s.acceso] || ETIQUETAS_ACCESO.sin_solicitud}
                  </span>
                )}
                <span className="entren-count-chip">{s.cantidad_videos} video(s)</span>
              </div>
            </Link>
            {esCuerpoTecnico && (
              <button
                className="entren-eliminar"
                title="Eliminar sesión"
                onClick={() => eliminarSesion(s.id)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function VideoEntrenamiento({ video, puedeEliminar, onEliminar }) {
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
          src={`${API_BASE}/api/entrenamientos/videos/${video.id}/archivo?token=${token}`}
        />
      ) : extraerIdYouTube(video.url_video) ? (
        <YouTubePlayer videoId={extraerIdYouTube(video.url_video)} />
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
  const [tituloVideo, setTituloVideo] = useState('')
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

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', fecha)
      if (descripcion) datos.append('descripcion', descripcion)
      if (tituloVideo) datos.append('titulo_video', tituloVideo)
      if (modo === 'archivo') {
        archivos.forEach((archivo) => datos.append('videos', archivo))
      } else if (urlVideo.trim()) {
        datos.append('url_video', urlVideo)
      }

      await api.post('/entrenamientos', datos)
      setMensaje('Sesión guardada correctamente')
      setDescripcion('')
      setTituloVideo('')
      setArchivos([])
      setUrlVideo('')
      onCreado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar la sesión'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card entren-form" onSubmit={onSubmit}>
      <h3>Nueva sesión de entrenamiento</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="entren-form-row">
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
      </div>

      <div className="field">
        <label>Descripción de la sesión (opcional, solo cuerpo técnico)</label>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>

      <div className="field">
        <label>Video del día <span className="campo-requerido">(opcional)</span></label>
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
          <textarea rows={2} value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} />
        </div>
      )}

      <div className="field">
        <label>Título del video {modo === 'archivo' ? '(opcional si subís varios)' : '(opcional)'}</label>
        <input value={tituloVideo} onChange={(e) => setTituloVideo(e.target.value)} />
      </div>

      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Guardar sesión'}
      </button>
    </form>
  )
}
