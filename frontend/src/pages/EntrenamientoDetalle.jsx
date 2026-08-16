import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import { VideoEntrenamiento, tituloSesion } from './Entrenamientos'
import ImportarGpsPanel from '../components/ImportarGpsPanel'
import './Entrenamientos.css'
import './EntrenamientoDetalle.css'

export default function EntrenamientoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esCuerpoTecnico } = useAuth()
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState(false)

  const cargar = () => {
    setCargando(true)
    api
      .get(`/entrenamientos/${id}`)
      .then(({ data }) => setSesion(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el entrenamiento')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [id])

  const eliminarSesion = async () => {
    if (!window.confirm('¿Eliminar esta sesión y todos sus videos? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/entrenamientos/${id}`)
      navigate('/entrenamientos')
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la sesión'))
    }
  }

  const eliminarVideo = async (videoId) => {
    if (!window.confirm('¿Eliminar este video?')) return
    try {
      await api.delete(`/entrenamientos/videos/${videoId}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el video'))
    }
  }

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error && !sesion) {
    return (
      <div className="page">
        <Link to="/entrenamientos" className="btn btn-ghost btn-sm">← Volver a Entrenamientos</Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
      </div>
    )
  }

  const puedeVerVideos = esCuerpoTecnico || sesion.acceso === 'aprobado'

  return (
    <div className="page">
      <Link to="/entrenamientos" className="btn btn-ghost btn-sm">← Volver a Entrenamientos</Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>{tituloSesion(sesion.fecha)}</h1>
          <p>{formatFecha(sesion.fecha)}</p>
        </div>
        {esCuerpoTecnico && !editando && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/entrenamientos/${id}/reflexion`} className="btn btn-ghost btn-sm">
              Reflexión del entrenamiento
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditando(true)}>Editar</button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {esCuerpoTecnico && editando && (
        <EdicionSesion
          sesion={sesion}
          onGuardado={() => {
            setEditando(false)
            cargar()
          }}
          onCancelar={() => setEditando(false)}
        />
      )}

      {!esCuerpoTecnico && !puedeVerVideos && (
        <SolicitarAcceso entrenamientoId={id} acceso={sesion.acceso} onSolicitado={cargar} />
      )}

      {puedeVerVideos && (
        <div className="card seccion" style={{ marginTop: 16 }}>
          <h3>Videos</h3>

          {sesion.videos.length === 0 && <p className="texto-muted">Esta sesión todavía no tiene videos.</p>}

          <div className="entren-videos">
            {sesion.videos.map((v) => (
              <VideoEntrenamiento
                key={v.id}
                video={v}
                puedeEliminar={esCuerpoTecnico}
                onEliminar={() => eliminarVideo(v.id)}
              />
            ))}
          </div>

          {esCuerpoTecnico && <AgregarVideo entrenamientoId={id} onAgregado={cargar} />}
        </div>
      )}

      {esCuerpoTecnico && <SolicitudesAcceso entrenamientoId={id} />}

      {esCuerpoTecnico && <Ejercicios entrenamientoId={id} />}

      {esCuerpoTecnico && (
        <div className="card seccion" style={{ marginTop: 16 }}>
          <h3>GPS del entrenamiento</h3>
          <ImportarGpsPanel
            fechaInicial={sesion.fecha ? sesion.fecha.slice(0, 10) : ''}
            partidoInicial={tituloSesion(sesion.fecha)}
          />
        </div>
      )}

      {esCuerpoTecnico && (
        <button className="btn btn-ghost btn-sm btn-danger" style={{ marginTop: 16 }} onClick={eliminarSesion}>
          Eliminar entrenamiento completo
        </button>
      )}
    </div>
  )
}

// Pantalla que ve el jugador cuando todavía no tiene acceso aprobado a la
// sesión: le permite pedirlo (o volver a pedirlo, si fue rechazado).
function SolicitarAcceso({ entrenamientoId, acceso, onSolicitado }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const solicitar = async () => {
    setEnviando(true)
    setError('')
    try {
      await api.post(`/entrenamientos/${entrenamientoId}/solicitar-acceso`)
      onSolicitado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo enviar la solicitud'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion entren-acceso-box" style={{ marginTop: 16 }}>
      {acceso === 'pendiente' ? (
        <>
          <h3>Solicitud enviada</h3>
          <p className="texto-muted">Tu pedido de acceso está esperando la aprobación del cuerpo técnico.</p>
        </>
      ) : (
        <>
          <h3>Acceso restringido</h3>
          <p className="texto-muted">
            {acceso === 'rechazado'
              ? 'Tu solicitud anterior fue rechazada. Podés volver a pedir acceso.'
              : 'Para ver los videos de esta sesión, primero tenés que pedirle acceso al cuerpo técnico.'}
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-sm" onClick={solicitar} disabled={enviando}>
            {enviando ? <span className="spinner" /> : 'Solicitar acceso'}
          </button>
        </>
      )}
    </div>
  )
}

// Panel del cuerpo técnico para aprobar o rechazar los pedidos de acceso a
// esta sesión. No se muestra si nunca hubo ningún pedido.
function SolicitudesAcceso({ entrenamientoId }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [resolviendoId, setResolviendoId] = useState(null)

  const cargar = () => {
    setCargando(true)
    api
      .get(`/entrenamientos/${entrenamientoId}/solicitudes`)
      .then(({ data }) => setSolicitudes(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar las solicitudes')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [entrenamientoId])

  const resolver = async (solicitudId, estado) => {
    setResolviendoId(solicitudId)
    try {
      await api.put(`/entrenamientos/${entrenamientoId}/solicitudes/${solicitudId}`, { estado })
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo actualizar la solicitud'))
    } finally {
      setResolviendoId(null)
    }
  }

  if (cargando || solicitudes.length === 0) {
    return null
  }

  return (
    <div className="card seccion" style={{ marginTop: 16 }}>
      <h3>Solicitudes de acceso</h3>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="entren-solicitudes-lista">
        {solicitudes.map((s) => (
          <div key={s.id} className="entren-solicitud-item">
            <span>{s.nombre} {s.apellido}</span>
            {s.estado === 'pendiente' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => resolver(s.id, 'aprobado')}
                  disabled={resolviendoId === s.id}
                >
                  Aprobar
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-danger"
                  onClick={() => resolver(s.id, 'rechazado')}
                  disabled={resolviendoId === s.id}
                >
                  Rechazar
                </button>
              </div>
            ) : (
              <span className={`entren-chip-acceso entren-chip-${s.estado}`}>
                {s.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EdicionSesion({ sesion, onGuardado, onCancelar }) {
  const [descripcion, setDescripcion] = useState(sesion.descripcion || '')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const datos = new FormData()
      if (descripcion !== '') datos.append('descripcion', descripcion)
      await api.put(`/entrenamientos/${sesion.id}`, datos)
      onGuardado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card seccion entren-form" onSubmit={guardar}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Descripción de la sesión (solo cuerpo técnico)</label>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>

      <div className="form-edicion-botones">
        <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Guardar'}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function AgregarVideo({ entrenamientoId, onAgregado }) {
  const [modo, setModo] = useState('archivo')
  const [titulo, setTitulo] = useState('')
  const [archivos, setArchivos] = useState([])
  const [urlVideo, setUrlVideo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

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
      if (titulo) datos.append('titulo_video', titulo)
      if (modo === 'archivo') {
        archivos.forEach((archivo) => datos.append('videos', archivo))
      } else {
        datos.append('url_video', urlVideo)
      }
      await api.put(`/entrenamientos/${entrenamientoId}`, datos)
      setTitulo('')
      setArchivos([])
      setUrlVideo('')
      onAgregado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo agregar el video'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="form-video" onSubmit={onSubmit} style={{ marginTop: 16 }}>
      <hr className="divisor" />
      <h4>Agregar otro video</h4>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Video <span className="campo-requerido">(obligatorio)</span></label>
        <div className="modo-toggle">
          <button type="button" className={`btn btn-sm ${modo === 'archivo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setModo('archivo')}>
            Subir archivo
          </button>
          <button type="button" className={`btn btn-sm ${modo === 'link' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setModo('link')}>
            Link externo
          </button>
        </div>
      </div>

      {modo === 'archivo' ? (
        <div className="field">
          <label>Archivos de video</label>
          <input type="file" accept="video/*" multiple onChange={(e) => setArchivos(Array.from(e.target.files))} />
          {archivos.length > 0 && <span className="texto-muted">{archivos.length} archivo(s) seleccionado(s)</span>}
        </div>
      ) : (
        <div className="field">
          <label>URLs del video (una por línea si son varios)</label>
          <textarea rows={2} value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} placeholder={'https://...\nhttps://...'} />
        </div>
      )}

      <div className="field">
        <label>Título (opcional)</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>

      <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Agregar video'}
      </button>
    </form>
  )
}

function Ejercicios({ entrenamientoId }) {
  const navigate = useNavigate()
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const [mostrarBuscador, setMostrarBuscador] = useState(false)

  const cargar = () => {
    setCargando(true)
    api
      .get(`/ejercicios/entrenamiento/${entrenamientoId}`)
      .then(({ data }) => setEjercicios(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar los ejercicios')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [entrenamientoId])

  const agregarEjercicio = async () => {
    setCreando(true)
    setError('')
    try {
      const { data } = await api.post(`/ejercicios/entrenamiento/${entrenamientoId}`)
      navigate(`/entrenamientos/${entrenamientoId}/ejercicios/${data.ejercicio_id}`)
    } catch (err) {
      setError(extraerError(err, 'No se pudo crear el ejercicio'))
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="card seccion" style={{ marginTop: 16 }}>
      <div className="seccion-header">
        <h3>Ejercicios</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMostrarBuscador((v) => !v)}
          >
            ↻ Reutilizar ejercicio
          </button>
          <button className="btn btn-primary btn-sm" onClick={agregarEjercicio} disabled={creando}>
            {creando ? <span className="spinner" /> : '+ Agregar ejercicio'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarBuscador && (
        <BuscadorEjercicios
          entrenamientoId={entrenamientoId}
          onReutilizado={(ejercicioId) => {
            setMostrarBuscador(false)
            navigate(`/entrenamientos/${entrenamientoId}/ejercicios/${ejercicioId}`)
          }}
          onCancelar={() => setMostrarBuscador(false)}
        />
      )}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && ejercicios.length === 0 && (
        <p className="texto-muted">Todavía no hay ejercicios cargados para esta sesión.</p>
      )}

      {!cargando && ejercicios.length > 0 && (
        <div className="ejercicios-lista">
          {ejercicios.map((ej) => (
            <Link
              key={ej.id}
              to={`/entrenamientos/${entrenamientoId}/ejercicios/${ej.id}`}
              className="ejercicio-chip"
            >
              <strong>Ejercicio {String(ej.numero).padStart(2, '0')}</strong>
              <span className="texto-muted">{ej.tipo_trabajo || 'Sin tipo de trabajo definido'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Busca entre todos los ejercicios ya cargados (de cualquier sesión) y
// copia el elegido a la sesión actual, para no tener que volver a armar
// desde cero una planificación o un dibujo táctico ya usado antes.
function BuscadorEjercicios({ entrenamientoId, onReutilizado, onCancelar }) {
  const [termino, setTermino] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(true)
  const [reutilizandoId, setReutilizandoId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setBuscando(true)
    const timeout = setTimeout(() => {
      api
        .get('/ejercicios/buscar', { params: { q: termino } })
        .then(({ data }) => setResultados(data))
        .catch((err) => setError(extraerError(err, 'No se pudo buscar')))
        .finally(() => setBuscando(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [termino])

  const reutilizar = async (ejercicio) => {
    setError('')
    setReutilizandoId(ejercicio.id)
    try {
      const { data } = await api.post(`/ejercicios/entrenamiento/${entrenamientoId}/reutilizar/${ejercicio.id}`)
      onReutilizado(data.ejercicio_id)
    } catch (err) {
      setError(extraerError(err, 'No se pudo reutilizar el ejercicio'))
      setReutilizandoId(null)
    }
  }

  return (
    <div className="card seccion buscador-ejercicios">
      <div className="field">
        <label>Buscar por tipo de trabajo, objetivo o espacio</label>
        <input
          autoFocus
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Ej: rondo, posesión, finalización..."
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {buscando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!buscando && resultados.length === 0 && (
        <p className="texto-muted">No se encontraron ejercicios cargados con ese criterio.</p>
      )}

      {!buscando && resultados.length > 0 && (
        <div className="buscador-ejercicios-lista">
          {resultados.map((ej) => (
            <div key={ej.id} className="buscador-ejercicios-item">
              <div>
                <strong>{ej.tipo_trabajo || 'Sin tipo de trabajo definido'}</strong>
                <span className="texto-muted"> — {formatFecha(ej.fecha)}</span>
                {ej.objetivo && <p className="texto-muted buscador-ejercicios-objetivo">{ej.objetivo}</p>}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => reutilizar(ej)}
                disabled={reutilizandoId !== null}
              >
                {reutilizandoId === ej.id ? <span className="spinner" /> : 'Usar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-ghost btn-sm" type="button" onClick={onCancelar} style={{ marginTop: 12 }}>
        Cancelar
      </button>
    </div>
  )
}
