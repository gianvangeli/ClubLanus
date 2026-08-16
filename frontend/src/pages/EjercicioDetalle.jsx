import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import EscudoClub from '../components/EscudoClub'
import CanchaEditor, { ESCENA_VACIA } from '../components/CanchaEditor'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import './EjercicioDetalle.css'

const CAMPOS_VACIOS = {
  dia: '',
  tipo_trabajo: '',
  espacio: '',
  objetivo: '',
  n_jugadores: '',
  duracion: '',
  descripcion: '',
}

export default function EjercicioDetalle() {
  const { id, ejercicioId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [ejercicio, setEjercicio] = useState(null)
  const [form, setForm] = useState(CAMPOS_VACIOS)
  const [dibujo, setDibujo] = useState(ESCENA_VACIA)
  const [modoPizarra, setModoPizarra] = useState('dibujo')
  const [archivoPizarra, setArchivoPizarra] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/ejercicios/${ejercicioId}`)
      .then(({ data }) => {
        setEjercicio(data)
        setForm({
          dia: data.dia ? String(data.dia).slice(0, 10) : '',
          tipo_trabajo: data.tipo_trabajo || '',
          espacio: data.espacio || '',
          objetivo: data.objetivo || '',
          n_jugadores: data.n_jugadores || '',
          duracion: data.duracion || '',
          descripcion: data.descripcion || '',
        })
        setDibujo(data.dibujo_json || ESCENA_VACIA)
        setModoPizarra(data.pizarra_modo || 'dibujo')
        setArchivoPizarra(null)
      })
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el ejercicio')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [ejercicioId])

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async () => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const datos = new FormData()
      Object.entries(form).forEach(([campo, valor]) => datos.append(campo, valor || ''))
      if (modoPizarra === 'archivo' && archivoPizarra) {
        datos.append('pizarra_archivo', archivoPizarra)
      } else if (modoPizarra === 'dibujo') {
        datos.append('dibujo_json', JSON.stringify(dibujo))
      }
      await api.put(`/ejercicios/${ejercicioId}`, datos)
      setMensaje('Guardado correctamente')
      setTimeout(() => setMensaje(''), 2500)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este ejercicio? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/ejercicios/${ejercicioId}`)
      navigate(`/entrenamientos/${id}`)
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el ejercicio'))
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

  if (error && !ejercicio) {
    return (
      <div className="page">
        <Link to={`/entrenamientos/${id}`} className="btn btn-ghost btn-sm">← Volver al entrenamiento</Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
      </div>
    )
  }

  return (
    <div className="page ejercicio-page">
      <Link to={`/entrenamientos/${id}`} className="btn btn-ghost btn-sm">← Volver al entrenamiento</Link>

      <div className="ej-hoja">
        <div className="ej-header">
          <div className="ej-header-club">
            <EscudoClub size={44} />
            <div>
              <strong>CLUB ATLÉTICO LANÚS</strong>
              <span>PLANIFICACIÓN TÁCTICA · CUERPO TÉCNICO</span>
            </div>
          </div>
          <div className="ej-header-datos">
            <div className="ej-header-numero">EJERCICIO {String(ejercicio.numero).padStart(2, '0')}</div>
            <div className="ej-header-campo">
              <label>Día:</label>
              <input type="date" value={form.dia} onChange={onChange('dia')} />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {mensaje && <div className="alert alert-success">{mensaje}</div>}

        <div className="ej-fila ej-fila-2">
          <div className="ej-campo">
            <label>Tipo de trabajo:</label>
            <input value={form.tipo_trabajo} onChange={onChange('tipo_trabajo')} />
          </div>
          <div className="ej-campo">
            <label>Espacio:</label>
            <input value={form.espacio} onChange={onChange('espacio')} />
          </div>
        </div>

        <div className="ej-fila">
          <div className="ej-campo">
            <label>Objetivo del entrenamiento:</label>
            <input value={form.objetivo} onChange={onChange('objetivo')} />
          </div>
        </div>

        <div className="ej-fila ej-fila-2">
          <div className="ej-campo">
            <label>N° jugadores:</label>
            <input value={form.n_jugadores} onChange={onChange('n_jugadores')} />
          </div>
          <div className="ej-campo">
            <label>Duración:</label>
            <input value={form.duracion} onChange={onChange('duracion')} />
          </div>
        </div>

        <div className="ej-cuerpo">
          <div className="ej-cancha-col">
            <div className="modo-toggle" style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={`btn btn-sm ${modoPizarra === 'dibujo' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setModoPizarra('dibujo')}
              >
                Dibujar pizarra
              </button>
              <button
                type="button"
                className={`btn btn-sm ${modoPizarra === 'archivo' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setModoPizarra('archivo')}
              >
                Subir imagen o video
              </button>
            </div>

            {modoPizarra === 'dibujo' ? (
              <CanchaEditor value={dibujo} onChange={setDibujo} editable />
            ) : (
              <div className="field">
                <label>Imagen o video de la pizarra</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setArchivoPizarra(e.target.files[0] || null)}
                />
                {archivoPizarra ? (
                  <span className="texto-muted">{archivoPizarra.name}</span>
                ) : ejercicio.pizarra_modo === 'archivo' ? (
                  ejercicio.pizarra_archivo_tipo === 'imagen' ? (
                    <img
                      className="et-pizarra-imagen"
                      src={`${API_BASE}/api/ejercicios/${ejercicioId}/pizarra-archivo?token=${token}`}
                      alt="Pizarra táctica"
                    />
                  ) : (
                    <video
                      className="video-player"
                      controls
                      preload="metadata"
                      src={`${API_BASE}/api/ejercicios/${ejercicioId}/pizarra-archivo?token=${token}`}
                    />
                  )
                ) : (
                  <span className="texto-muted">Todavía no se subió ningún archivo de pizarra.</span>
                )}
              </div>
            )}
          </div>
          <div className="ej-texto-col">
            <div className="ej-campo ej-campo-grande">
              <label>Descripción del ejercicio:</label>
              <textarea rows={10} value={form.descripcion} onChange={onChange('descripcion')} />
            </div>

            <VideoRealEjercicio ejercicioId={ejercicioId} videos={ejercicio.videos || []} onCambio={cargar} />
          </div>
        </div>
      </div>

      <div className="ej-acciones">
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? <span className="spinner" /> : 'Guardar'}
        </button>
        <button className="btn btn-ghost btn-danger" onClick={eliminar}>
          Eliminar ejercicio
        </button>
      </div>
    </div>
  )
}

// Video real de la ejecución del ejercicio, para comparar al lado de la
// animación de la pizarra: cómo se dibujó vs. cómo se hizo en la cancha.
function VideoRealEjercicio({ ejercicioId, videos, onCambio }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [modo, setModo] = useState('archivo')
  const [titulo, setTitulo] = useState('')
  const [archivos, setArchivos] = useState([])
  const [urlVideo, setUrlVideo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const token = localStorage.getItem('token')

  const subir = async (e) => {
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
      await api.post(`/ejercicios/${ejercicioId}/videos`, datos)
      setTitulo('')
      setArchivos([])
      setUrlVideo('')
      setMostrarForm(false)
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo agregar el video'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminarVideo = async (videoId) => {
    if (!window.confirm('¿Eliminar este video?')) return
    try {
      await api.delete(`/ejercicios/videos/${videoId}`)
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el video'))
    }
  }

  return (
    <div className="ej-campo ej-campo-grande">
      <div className="ej-video-header">
        <label style={{ marginBottom: 0 }}>Video real del ejercicio:</label>
        {!mostrarForm && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrarForm(true)}>
            + Agregar video
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {videos.length === 0 && !mostrarForm && (
        <p className="texto-muted">Todavía no se cargó un video real de este ejercicio.</p>
      )}

      {videos.length > 0 && (
        <div className="ej-video-lista">
          {videos.map((v) => (
            <div key={v.id} className="ej-video-item">
              <div className="ej-video-item-header">
                <strong>{v.titulo}</strong>
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminarVideo(v.id)}>
                  Eliminar
                </button>
              </div>
              {v.tipo === 'archivo' ? (
                <video
                  className="video-player"
                  controls
                  preload="metadata"
                  src={`${API_BASE}/api/ejercicios/videos/${v.id}/archivo?token=${token}`}
                />
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
      )}

      {mostrarForm && (
        <form className="form-video" onSubmit={subir} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Video</label>
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
              <input type="file" accept="video/*" multiple onChange={(e) => setArchivos(Array.from(e.target.files))} />
              {archivos.length > 0 && <span className="texto-muted">{archivos.length} archivo(s) seleccionado(s)</span>}
            </div>
          ) : (
            <div className="field">
              <textarea rows={2} value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} placeholder={'https://...\nhttps://...'} />
            </div>
          )}

          <div className="field">
            <label>Título (opcional)</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Agregar video'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
