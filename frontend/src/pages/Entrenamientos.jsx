import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { extraerError } from '../api/client'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import './Entrenamientos.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function Entrenamientos() {
  const [vista, setVista] = useState('agenda')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Entrenamientos</h1>
          <p>Agenda de videos por día y rutinas extra — visible para todo el plantel</p>
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
          Entrenamientos extra
        </button>
      </div>

      {vista === 'agenda' ? <AgendaDiaria /> : <RutinasExtra />}
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
                  {new Date(s.fecha).toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
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

export function Planificacion({ sesion }) {
  const token = localStorage.getItem('token')
  const s = sesion || {}
  const datos = [
    ['Tipo', s.tipo_entrenamiento],
    ['Duración', s.duracion_minutos ? `${s.duracion_minutos} min` : null],
    ['Cantidad de jugadores', s.cantidad_jugadores],
    ['Objetivo', s.objetivo],
    ['Materiales', s.materiales],
    ['Espacios', s.espacios],
    ['Observaciones', s.observaciones],
  ].filter(([, valor]) => valor)

  if (datos.length === 0 && !s.dibujo_url) return null

  return (
    <div className="entren-planificacion">
      <h4>Planificación (solo cuerpo técnico)</h4>
      {datos.length > 0 && (
        <dl className="info-lista">
          {datos.map(([label, valor]) => (
            <div className="info-dato" key={label}>
              <dt>{label}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.dibujo_url && (
        <img
          className="entren-dibujo"
          src={`/api/entrenamientos/${s.id}/dibujo?token=${token}`}
          alt="Dibujo táctico de la sesión"
        />
      )}
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
          src={`/api/entrenamientos/videos/${video.id}/archivo?token=${token}`}
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

const PLANIFICACION_VACIA = {
  tipo_entrenamiento: '',
  duracion_minutos: '',
  objetivo: '',
  cantidad_jugadores: '',
  materiales: '',
  espacios: '',
  observaciones: '',
}

function NuevaSesion({ onCreado }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tituloVideo, setTituloVideo] = useState('')
  const [modo, setModo] = useState('archivo')
  const [archivos, setArchivos] = useState([])
  const [urlVideo, setUrlVideo] = useState('')
  const [mostrarPlanificacion, setMostrarPlanificacion] = useState(false)
  const [planificacion, setPlanificacion] = useState(PLANIFICACION_VACIA)
  const [dibujo, setDibujo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const onCambioPlanificacion = (campo) => (e) =>
    setPlanificacion({ ...planificacion, [campo]: e.target.value })

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
      Object.entries(planificacion).forEach(([campo, valor]) => {
        if (valor) datos.append(campo, valor)
      })
      if (dibujo) datos.append('dibujo', dibujo)

      await api.post('/entrenamientos', datos)
      setMensaje('Sesión guardada correctamente')
      setTitulo('')
      setDescripcion('')
      setTituloVideo('')
      setArchivos([])
      setUrlVideo('')
      setPlanificacion(PLANIFICACION_VACIA)
      setDibujo(null)
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
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Entrenamiento de velocidad — visible para el jugador"
          />
        </div>
      </div>

      <div className="field">
        <label>Descripción de la sesión (opcional, solo cuerpo técnico)</label>
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Semanita de impacto — sesión de velocidad"
        />
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
          <textarea
            rows={2}
            value={urlVideo}
            onChange={(e) => setUrlVideo(e.target.value)}
            placeholder={'https://...\nhttps://...'}
          />
        </div>
      )}

      <div className="field">
        <label>Título del video {modo === 'archivo' ? '(opcional si subís varios)' : '(opcional)'}</label>
        <input
          value={tituloVideo}
          onChange={(e) => setTituloVideo(e.target.value)}
          placeholder={modo === 'archivo' ? 'Se usa el nombre del archivo si lo dejás vacío' : 'Se usa el link si lo dejás vacío'}
        />
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => setMostrarPlanificacion((v) => !v)}
      >
        {mostrarPlanificacion ? '− Ocultar' : '+ Agregar'} planificación de la sesión (solo cuerpo técnico)
      </button>

      {mostrarPlanificacion && (
        <div className="entren-planificacion-form">
          <div className="entren-form-row">
            <div className="field">
              <label>Tipo de entrenamiento</label>
              <input
                value={planificacion.tipo_entrenamiento}
                onChange={onCambioPlanificacion('tipo_entrenamiento')}
                placeholder="Ej: Táctico, Fuerza, Recuperación"
              />
            </div>
            <div className="field">
              <label>Duración (minutos)</label>
              <input
                type="text"
                inputMode="numeric"
                value={planificacion.duracion_minutos}
                onChange={onCambioPlanificacion('duracion_minutos')}
              />
            </div>
            <div className="field">
              <label>Cantidad de jugadores</label>
              <input
                type="text"
                inputMode="numeric"
                value={planificacion.cantidad_jugadores}
                onChange={onCambioPlanificacion('cantidad_jugadores')}
              />
            </div>
          </div>

          <div className="field">
            <label>Objetivo</label>
            <input value={planificacion.objetivo} onChange={onCambioPlanificacion('objetivo')} />
          </div>
          <div className="field">
            <label>Materiales</label>
            <input value={planificacion.materiales} onChange={onCambioPlanificacion('materiales')} placeholder="Ej: Conos, pecheras, vallas" />
          </div>
          <div className="field">
            <label>Espacios</label>
            <input value={planificacion.espacios} onChange={onCambioPlanificacion('espacios')} placeholder="Ej: Media cancha, campo reducido" />
          </div>
          <div className="field">
            <label>Observaciones</label>
            <textarea
              rows={2}
              value={planificacion.observaciones}
              onChange={onCambioPlanificacion('observaciones')}
            />
          </div>
          <div className="field">
            <label>Dibujo táctico (imagen, opcional)</label>
            <input type="file" accept="image/*" onChange={(e) => setDibujo(e.target.files[0] || null)} />
            {dibujo && <span className="texto-muted">{dibujo.name}</span>}
          </div>
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Guardar sesión'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Entrenamientos extra: rutinas para que el jugador trabaje fuera del club.
// El CT las carga (generales o individuales) y el jugador marca si las
// completó o no.
// ---------------------------------------------------------------------------

function RutinasExtra() {
  const { esCuerpoTecnico } = useAuth()
  return esCuerpoTecnico ? <RutinasExtraStaff /> : <RutinasExtraJugador />
}

function RutinasExtraJugador() {
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
      .catch((err) => setError(extraerError(err, 'No se pudo cargar los entrenamientos extra')))
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

  const marcarCompletado = async (id, completado) => {
    try {
      await api.put(`/rutinas/${id}/completado`, { completado })
      setRutinas((prev) => prev.map((r) => (r.id === id ? { ...r, completado } : r)))
      setDetalles((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], completado } } : prev))
    } catch (err) {
      setError(extraerError(err, 'No se pudo actualizar el estado'))
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
          <p>Todavía no tenés entrenamientos extra asignados.</p>
        </div>
      )}

      <div className="entren-lista">
        {rutinas.map((r) => (
          <div className={`card entren-sesion ${r.completado ? 'rutina-completada' : ''}`} key={r.id}>
            <button className="entren-sesion-header" onClick={() => alternar(r.id)}>
              <div className="entren-sesion-fecha">{r.titulo}</div>
              <div className="entren-sesion-meta">
                <span className={`entren-count-chip ${r.completado ? 'entren-count-chip-ok' : ''}`}>
                  {r.completado ? 'Completado ✓' : 'Pendiente'}
                </span>
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

                <button
                  className={`btn btn-sm ${r.completado ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => marcarCompletado(r.id, !r.completado)}
                >
                  {r.completado ? 'Desmarcar como completado' : 'Marcar como completado'}
                </button>
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
          src={`/api/rutinas/videos/${video.id}/archivo?token=${token}`}
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

const RUTINA_VACIA = { titulo: '', descripcion: '', alcance: 'general' }

function RutinasExtraStaff() {
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
      .catch((err) => setError(extraerError(err, 'No se pudo cargar los entrenamientos extra')))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
    api.get('/jugadores').then(({ data }) => setJugadores(data)).catch(() => {})
  }, [])

  const vinculados = jugadores.filter((j) => j.usuario_id).length

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
    if (!window.confirm('¿Eliminar este entrenamiento extra? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/rutinas/${id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el entrenamiento extra'))
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
          <p>Todavía no hay entrenamientos extra cargados.</p>
        </div>
      )}

      <div className="entren-lista">
        {rutinas.map((r) => (
          <div className="card entren-sesion" key={r.id}>
            <button className="entren-sesion-header" onClick={() => alternar(r.id)}>
              <div className="entren-sesion-fecha">{r.titulo}</div>
              <div className="entren-sesion-meta">
                <span className="texto-muted">{r.alcance === 'individual' ? 'Individual' : 'Todo el plantel'}</span>
                <span className="entren-count-chip">
                  {r.completados}/{r.alcance === 'individual' ? r.asignados : vinculados} completado(s)
                </span>
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

                    <table className="tabla tabla-compacta" style={{ marginTop: 14 }}>
                      <thead>
                        <tr>
                          <th>Jugador</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles[r.id]?.jugadores?.map((j) => (
                          <tr key={j.id}>
                            <td>{j.nombre} {j.apellido}</td>
                            <td>
                              {j.completado ? (
                                <span className="entren-count-chip entren-count-chip-ok">Completado ✓</span>
                              ) : (
                                <span className="texto-muted">Pendiente</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <button
                      className="btn btn-ghost btn-sm btn-danger"
                      style={{ marginTop: 14 }}
                      onClick={() => eliminar(r.id)}
                    >
                      Eliminar entrenamiento extra
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
      if (form.descripcion) datos.append('descripcion', form.descripcion)
      datos.append('alcance', form.alcance)
      jugadorIds.forEach((id) => datos.append('jugador_ids', id))
      if (modo === 'archivo' && archivo) {
        datos.append('video', archivo)
      } else if (modo === 'link' && urlVideo.trim()) {
        datos.append('url_video', urlVideo.trim())
      }

      await api.post('/rutinas', datos)
      setMensaje('Entrenamiento extra guardado correctamente')
      setForm(RUTINA_VACIA)
      setJugadorIds([])
      setArchivo(null)
      setUrlVideo('')
      onCreado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el entrenamiento extra'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card entren-form" onSubmit={onSubmit}>
      <h3>Nuevo entrenamiento extra</h3>
      <p className="texto-muted" style={{ marginTop: -8 }}>
        Para que el jugador trabaje fuera del club. Puede ser para todo el plantel o para jugadores puntuales.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="field">
        <label>Título</label>
        <input value={form.titulo} onChange={onChange('titulo')} placeholder="Ej: Rutina de fuerza — semana 1" required />
      </div>

      <div className="field">
        <label>Rutina / instrucciones</label>
        <textarea
          rows={4}
          value={form.descripcion}
          onChange={onChange('descripcion')}
          placeholder={'Ej:\n3x15 sentadillas\n4x10 flexiones\n3x30" plancha'}
        />
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
          <input value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} placeholder="https://..." />
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Guardar entrenamiento extra'}
      </button>
    </form>
  )
}
