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

export default function Entrenamientos() {
  const [vista, setVista] = useState('agenda')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Entrenamientos</h1>
          <p>Agenda de videos por día y entrenamientos desglosados — visible para todo el plantel</p>
        </div>
      </div>

      <div className="entren-tabs">
        <button
          className={`btn btn-sm ${vista === 'agenda' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setVista('agenda')}
        >
          Agenda diaria
        </button>
        <button
          className={`btn btn-sm ${vista === 'extra' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setVista('extra')}
        >
          Entrenamientos desglosados
        </button>
      </div>

      {vista === 'agenda' ? <AgendaDiaria /> : <EntrenamientosDesglosados />}
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
                <strong>{s.titulo || 'Entrenamiento del día'}</strong>
                <span className="texto-muted entren-sesion-subfecha">
                  {formatFecha(s.fecha)}
                </span>
              </div>
              <div className="entren-sesion-meta">
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
  const [titulo, setTitulo] = useState('')
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
      if (titulo) datos.append('titulo', titulo)
      if (descripcion) datos.append('descripcion', descripcion)
      if (tituloVideo) datos.append('titulo_video', tituloVideo)
      if (modo === 'archivo') {
        archivos.forEach((archivo) => datos.append('videos', archivo))
      } else if (urlVideo.trim()) {
        datos.append('url_video', urlVideo)
      }

      await api.post('/entrenamientos', datos)
      setMensaje('Sesión guardada correctamente')
      setTitulo('')
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
        <div className="field" style={{ flex: 1 }}>
          <label>Título del entrenamiento (opcional)</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
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

// ---------------------------------------------------------------------------
// Entrenamientos desglosados: videos cortos de ejercicios ya realizados en
// la cancha (dinámica, cantidad de jugadores), para repasarlos. El CT los
// carga (para todo el plantel o para jugadores puntuales); no hay nada que
// "completar", es un archivo de consulta.
// ---------------------------------------------------------------------------

function EntrenamientosDesglosados() {
  const { esCuerpoTecnico } = useAuth()
  const [sub, setSub] = useState('general')

  return (
    <div>
      <div className="et-tabs">
        <button className={`btn btn-sm ${sub === 'general' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSub('general')}>
          General
        </button>
        <button className={`btn btn-sm ${sub === 'rondos' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSub('rondos')}>
          Rondos
        </button>
        <button
          className={`btn btn-sm ${sub === 'pelota_parada' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSub('pelota_parada')}
        >
          Pelota parada
        </button>
      </div>

      {sub === 'general' && (esCuerpoTecnico ? <EntrenamientosDesglosadosStaff /> : <EntrenamientosDesglosadosJugador />)}
      {(sub === 'rondos' || sub === 'pelota_parada') && <EjerciciosTacticos categoriaFija={sub} />}
    </div>
  )
}

function EntrenamientosDesglosadosJugador() {
  const [rutinas, setRutinas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})

  const cargar = () => {
    setCargando(true)
    api
      .get('/rutinas')
      .then(({ data }) => setRutinas(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar los entrenamientos desglosados')))
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
        .get(`/rutinas/${id}`)
        .then(({ data }) => setDetalles((prev) => ({ ...prev, [id]: { ...data, cargando: false } })))
        .catch(() => setDetalles((prev) => ({ ...prev, [id]: { cargando: false, videos: [], error: true } })))
    }
  }

  return (
    <div>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && rutinas.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no hay entrenamientos desglosados cargados.</p>
        </div>
      )}

      <div className="entren-lista">
        {rutinas.map((r) => (
          <div className="card entren-sesion" key={r.id}>
            <button className="entren-sesion-header" onClick={() => alternar(r.id)}>
              <div className="entren-sesion-fecha">{r.titulo}</div>
              <div className="entren-sesion-meta">
                {r.fecha && (
                  <span className="texto-muted">
                    {formatFecha(r.fecha)}
                  </span>
                )}
                {r.cantidad_jugadores && <span className="entren-count-chip">{r.cantidad_jugadores} jugador(es)</span>}
                <span className="entren-chevron">{abierta === r.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {abierta === r.id && (
              <div className="entren-sesion-body">
                {detalles[r.id]?.cargando && (
                  <div className="empty-state">
                    <span className="spinner spinner-dark" />
                  </div>
                )}

                {r.descripcion && <p className="texto-muted" style={{ margin: '12px 0' }}>{r.descripcion}</p>}

                <div className="entren-videos">
                  {detalles[r.id]?.videos?.map((v) => (
                    <VideoRutina key={v.id} video={v} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoRutina({ video }) {
  const token = localStorage.getItem('token')
  return (
    <div className="entren-video-item">
      <div className="entren-video-item-header">
        <strong>{video.titulo}</strong>
      </div>
      {video.tipo === 'archivo' ? (
        <video
          className="video-player"
          controls
          preload="metadata"
          src={`${API_BASE}/api/rutinas/videos/${video.id}/archivo?token=${token}`}
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

const RUTINA_VACIA = { titulo: '', fecha: hoyISO(), descripcion: '', cantidad_jugadores: '', alcance: 'general' }

function EntrenamientosDesglosadosStaff() {
  const [rutinas, setRutinas] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})

  const cargar = () => {
    setCargando(true)
    api
      .get('/rutinas/admin')
      .then(({ data }) => setRutinas(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar los entrenamientos desglosados')))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
    api.get('/jugadores').then(({ data }) => setJugadores(data)).catch(() => {})
  }, [])

  const alternar = (id) => {
    if (abierta === id) {
      setAbierta(null)
      return
    }
    setAbierta(id)
    setDetalles((prev) => ({ ...prev, [id]: { cargando: true } }))
    api
      .get(`/rutinas/admin/${id}`)
      .then(({ data }) => setDetalles((prev) => ({ ...prev, [id]: { ...data, cargando: false } })))
      .catch(() => setDetalles((prev) => ({ ...prev, [id]: { cargando: false, error: true } })))
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este entrenamiento desglosado? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/rutinas/${id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el entrenamiento desglosado'))
    }
  }

  return (
    <div>
      <NuevaRutina jugadores={jugadores} onCreado={cargar} />

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && rutinas.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no hay entrenamientos desglosados cargados.</p>
        </div>
      )}

      <div className="entren-lista">
        {rutinas.map((r) => (
          <div className="card entren-sesion" key={r.id}>
            <button className="entren-sesion-header" onClick={() => alternar(r.id)}>
              <div className="entren-sesion-fecha">{r.titulo}</div>
              <div className="entren-sesion-meta">
                <span className="texto-muted">{r.alcance === 'individual' ? 'Individual' : 'Todo el plantel'}</span>
                {r.fecha && (
                  <span className="texto-muted">
                    {formatFecha(r.fecha)}
                  </span>
                )}
                {r.cantidad_jugadores && <span className="entren-count-chip">{r.cantidad_jugadores} jugador(es)</span>}
                <span className="entren-chevron">{abierta === r.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {abierta === r.id && (
              <div className="entren-sesion-body">
                {detalles[r.id]?.cargando && (
                  <div className="empty-state">
                    <span className="spinner spinner-dark" />
                  </div>
                )}

                {!detalles[r.id]?.cargando && (
                  <>
                    {detalles[r.id]?.descripcion && (
                      <p className="texto-muted" style={{ margin: '12px 0' }}>{detalles[r.id].descripcion}</p>
                    )}

                    <div className="entren-videos">
                      {detalles[r.id]?.videos?.map((v) => (
                        <VideoRutina key={v.id} video={v} />
                      ))}
                    </div>

                    {r.alcance === 'individual' && (
                      <ul className="rutina-jugadores-lista">
                        {detalles[r.id]?.jugadores?.map((j) => (
                          <li key={j.id}>{j.nombre} {j.apellido}</li>
                        ))}
                      </ul>
                    )}

                    <button
                      className="btn btn-ghost btn-sm btn-danger"
                      style={{ marginTop: 14 }}
                      onClick={() => eliminar(r.id)}
                    >
                      Eliminar entrenamiento desglosado
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function NuevaRutina({ jugadores, onCreado }) {
  const [form, setForm] = useState(RUTINA_VACIA)
  const [jugadorIds, setJugadorIds] = useState([])
  const [modo, setModo] = useState('archivo')
  const [archivo, setArchivo] = useState(null)
  const [urlVideo, setUrlVideo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const toggleJugador = (id) => {
    setJugadorIds((prev) => (prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    if (form.alcance === 'individual' && jugadorIds.length === 0) {
      setError('Elegí al menos un jugador')
      return
    }

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('titulo', form.titulo)
      if (form.fecha) datos.append('fecha', form.fecha)
      if (form.descripcion) datos.append('descripcion', form.descripcion)
      if (form.cantidad_jugadores) datos.append('cantidad_jugadores', form.cantidad_jugadores)
      datos.append('alcance', form.alcance)
      jugadorIds.forEach((id) => datos.append('jugador_ids', id))
      if (modo === 'archivo' && archivo) {
        datos.append('video', archivo)
      } else if (modo === 'link' && urlVideo.trim()) {
        datos.append('url_video', urlVideo.trim())
      }

      await api.post('/rutinas', datos)
      setMensaje('Entrenamiento desglosado guardado correctamente')
      setForm(RUTINA_VACIA)
      setJugadorIds([])
      setArchivo(null)
      setUrlVideo('')
      onCreado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el entrenamiento desglosado'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card entren-form" onSubmit={onSubmit}>
      <h3>Nuevo entrenamiento desglosado</h3>
      <p className="texto-muted" style={{ marginTop: -8 }}>
        Video corto de un ejercicio ya realizado en la cancha, para repasar su dinámica. Puede ser para todo el plantel o para jugadores puntuales.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="entren-form-row">
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={form.fecha} onChange={onChange('fecha')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Título / ejercicio</label>
          <input value={form.titulo} onChange={onChange('titulo')} required />
        </div>
        <div className="field">
          <label>Cantidad de jugadores</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.cantidad_jugadores}
            onChange={onChange('cantidad_jugadores')}
          />
        </div>
      </div>

      <div className="field">
        <label>Descripción de la dinámica</label>
        <textarea rows={4} value={form.descripcion} onChange={onChange('descripcion')} />
      </div>

      <div className="modo-toggle">
        <button
          type="button"
          className={`btn btn-sm ${form.alcance === 'general' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setForm({ ...form, alcance: 'general' })}
        >
          Todo el plantel
        </button>
        <button
          type="button"
          className={`btn btn-sm ${form.alcance === 'individual' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setForm({ ...form, alcance: 'individual' })}
        >
          Jugadores puntuales
        </button>
      </div>

      {form.alcance === 'individual' && (
        <div className="rutina-jugadores-selector">
          {jugadores.length === 0 && <p className="texto-muted">No hay jugadores cargados todavía.</p>}
          {jugadores.map((j) => (
            <label key={j.id} className="rutina-jugador-check">
              <input
                type="checkbox"
                checked={jugadorIds.includes(j.id)}
                onChange={() => toggleJugador(j.id)}
              />
              {j.nombre} {j.apellido}
            </label>
          ))}
        </div>
      )}

      <div className="modo-toggle">
        <button
          type="button"
          className={`btn btn-sm ${modo === 'archivo' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setModo('archivo')}
        >
          Video: archivo
        </button>
        <button
          type="button"
          className={`btn btn-sm ${modo === 'link' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setModo('link')}
        >
          Video: link
        </button>
      </div>

      {modo === 'archivo' ? (
        <div className="field">
          <label>Video demostrativo (opcional)</label>
          <input type="file" accept="video/*" onChange={(e) => setArchivo(e.target.files[0] || null)} />
          {archivo && <span className="texto-muted">{archivo.name}</span>}
        </div>
      ) : (
        <div className="field">
          <label>Link del video (opcional)</label>
          <input value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} />
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Guardar entrenamiento desglosado'}
      </button>
    </form>
  )
}
