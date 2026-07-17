import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { extraerError } from '../api/client'
import { Planificacion, VideoEntrenamiento } from './Entrenamientos'
import './Entrenamientos.css'
import './EntrenamientoDetalle.css'

const PLANIFICACION_VACIA = {
  titulo: '',
  descripcion: '',
  tipo_entrenamiento: '',
  duracion_minutos: '',
  objetivo: '',
  cantidad_jugadores: '',
  materiales: '',
  espacios: '',
  observaciones: '',
}

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

  return (
    <div className="page">
      <Link to="/entrenamientos" className="btn btn-ghost btn-sm">← Volver a Entrenamientos</Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>{sesion.titulo || 'Entrenamiento del día'}</h1>
          <p style={{ textTransform: 'capitalize' }}>
            {new Date(sesion.fecha).toLocaleDateString('es-AR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
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

      {esCuerpoTecnico && editando ? (
        <EdicionSesion
          sesion={sesion}
          onGuardado={() => {
            setEditando(false)
            cargar()
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        esCuerpoTecnico && <Planificacion sesion={sesion} />
      )}

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

      {esCuerpoTecnico && <Ejercicios entrenamientoId={id} />}

      {esCuerpoTecnico && (
        <button className="btn btn-ghost btn-sm btn-danger" style={{ marginTop: 16 }} onClick={eliminarSesion}>
          Eliminar entrenamiento completo
        </button>
      )}
    </div>
  )
}

function EdicionSesion({ sesion, onGuardado, onCancelar }) {
  const [form, setForm] = useState({
    titulo: sesion.titulo || '',
    descripcion: sesion.descripcion || '',
    tipo_entrenamiento: sesion.tipo_entrenamiento || '',
    duracion_minutos: sesion.duracion_minutos ?? '',
    objetivo: sesion.objetivo || '',
    cantidad_jugadores: sesion.cantidad_jugadores ?? '',
    materiales: sesion.materiales || '',
    espacios: sesion.espacios || '',
    observaciones: sesion.observaciones || '',
  })
  const [dibujo, setDibujo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const datos = new FormData()
      Object.entries(form).forEach(([campo, valor]) => {
        if (valor !== '') datos.append(campo, valor)
      })
      if (dibujo) datos.append('dibujo', dibujo)
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
        <label>Título del entrenamiento (visible para el jugador)</label>
        <input value={form.titulo} onChange={onChange('titulo')} placeholder="Ej: Entrenamiento de velocidad" />
      </div>
      <div className="field">
        <label>Descripción de la sesión (solo cuerpo técnico)</label>
        <input value={form.descripcion} onChange={onChange('descripcion')} />
      </div>

      <div className="entren-form-row">
        <div className="field">
          <label>Tipo de entrenamiento</label>
          <input value={form.tipo_entrenamiento} onChange={onChange('tipo_entrenamiento')} placeholder="Ej: Táctico, Fuerza, Recuperación" />
        </div>
        <div className="field">
          <label>Duración (minutos)</label>
          <input type="text" inputMode="numeric" value={form.duracion_minutos} onChange={onChange('duracion_minutos')} />
        </div>
        <div className="field">
          <label>Cantidad de jugadores</label>
          <input type="text" inputMode="numeric" value={form.cantidad_jugadores} onChange={onChange('cantidad_jugadores')} />
        </div>
      </div>

      <div className="field">
        <label>Objetivo</label>
        <input value={form.objetivo} onChange={onChange('objetivo')} />
      </div>
      <div className="field">
        <label>Materiales</label>
        <input value={form.materiales} onChange={onChange('materiales')} placeholder="Ej: Conos, pecheras, vallas" />
      </div>
      <div className="field">
        <label>Espacios</label>
        <input value={form.espacios} onChange={onChange('espacios')} placeholder="Ej: Media cancha, campo reducido" />
      </div>
      <div className="field">
        <label>Observaciones</label>
        <textarea rows={2} value={form.observaciones} onChange={onChange('observaciones')} />
      </div>
      <div className="field">
        <label>Dibujo táctico (imagen, opcional — reemplaza el actual)</label>
        <input type="file" accept="image/*" onChange={(e) => setDibujo(e.target.files[0] || null)} />
        {dibujo && <span className="texto-muted">{dibujo.name}</span>}
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
        <button className="btn btn-primary btn-sm" onClick={agregarEjercicio} disabled={creando}>
          {creando ? <span className="spinner" /> : '+ Agregar ejercicio'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
