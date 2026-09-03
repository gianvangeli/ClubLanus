import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { formatFechaHora } from '../utils/fecha'
import PlanPartidoEditor from '../components/PlanPartidoEditor'
import ImportarGpsPanel from '../components/ImportarGpsPanel'
import './AdminBibliotecaDetalle.css'

const VIDEO_VACIO = {
  titulo: '',
  descripcion: '',
  url_video: '',
}

export default function AdminBibliotecaDetalle() {
  const { id } = useParams()
  const [publicacion, setPublicacion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarPublicacion = () => {
    api
      .get(`/biblioteca/${id}`)
      .then(({ data }) => setPublicacion(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la publicación')))
      .finally(() => setCargando(false))
  }

  useEffect(cargarPublicacion, [id])

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error && !publicacion) {
    return (
      <div className="page">
        <Link to="/admin/biblioteca" className="btn btn-ghost btn-sm">
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
      <Link to="/admin/biblioteca" className="btn btn-ghost btn-sm">
        ← Volver a la biblioteca
      </Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>{publicacion.titulo}</h1>
          {publicacion.descripcion && <p>{publicacion.descripcion}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge">{publicacion.tipo === 'analisis' ? 'Análisis' : 'Partido'}</span>
          <span className={`badge ${publicacion.estado === 'publicado' ? 'badge-success' : 'badge-warning'}`}>
            {publicacion.estado}
          </span>
        </div>
      </div>

      {publicacion.tipo === 'analisis' && (
        <SeccionAnalisis
          bibliotecaId={id}
          analisisTipo={publicacion.analisis_tipo}
          planPartido={publicacion.plan_partido_json}
          analisisModo={publicacion.analisis_modo}
          analisisPdfNombre={publicacion.analisis_pdf_nombre_original}
          onCambio={cargarPublicacion}
        />
      )}

      {publicacion.tipo === 'partido' && (
        <div className="card seccion" style={{ marginTop: 16 }}>
          <h3>GPS del partido</h3>
          <ImportarGpsPanel
            fechaInicial={publicacion.fecha_publicacion ? publicacion.fecha_publicacion.slice(0, 10) : ''}
            partidoInicial={publicacion.titulo}
          />
        </div>
      )}

      <div className="detalle-grid">
        <SeccionVideos
          bibliotecaId={id}
          videos={publicacion.videos}
          onVideoAgregado={cargarPublicacion}
        />
        {publicacion.tipo === 'partido' ? (
          <div className="card seccion">
            <h3>Jugadores asignados</h3>
            <p className="texto-muted">
              Los partidos son visibles para todo el plantel automáticamente: no hace falta asignarlos.
            </p>
          </div>
        ) : (
          <SeccionJugadores bibliotecaId={id} asignados={publicacion.jugadores_asignados} onAsignado={cargarPublicacion} />
        )}
      </div>

      {publicacion.tipo !== 'partido' && <SeccionReporte bibliotecaId={id} />}
    </div>
  )
}

function SeccionAnalisis({ bibliotecaId, analisisTipo, planPartido, analisisModo, analisisPdfNombre, onCambio }) {
  const [plan, setPlan] = useState(planPartido || [])
  const [guardandoTipo, setGuardandoTipo] = useState(false)
  const [guardandoPlan, setGuardandoPlan] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [subiendoPdf, setSubiendoPdf] = useState(false)

  useEffect(() => setPlan(planPartido || []), [planPartido])

  // Solo controla qué UI se muestra: el modo real (analisis_modo) recién
  // cambia en el servidor cuando se guarda el plan ("Guardar plan de
  // partido" fuerza 'armado' y borra el PDF) o se sube un PDF (fuerza
  // 'archivo' y borra el plan) — ver bibliotecaController.js.
  const [modoVista, setModoVista] = useState(analisisModo === 'archivo' ? 'archivo' : 'armado')
  useEffect(() => setModoVista(analisisModo === 'archivo' ? 'archivo' : 'armado'), [analisisModo])

  const subirPdf = async () => {
    if (!archivo) {
      setError('Elegí un archivo PDF')
      return
    }
    setSubiendoPdf(true)
    setError('')
    try {
      const datos = new FormData()
      datos.append('archivo', archivo)
      await api.post(`/biblioteca/${bibliotecaId}/analisis-pdf`, datos)
      setArchivo(null)
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo subir el PDF'))
    } finally {
      setSubiendoPdf(false)
    }
  }

  const elegirTipo = async (nuevoTipo) => {
    if (nuevoTipo === analisisTipo) return
    setGuardandoTipo(true)
    setError('')
    try {
      await api.put(`/biblioteca/${bibliotecaId}`, { analisis_tipo: nuevoTipo })
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el tipo de análisis'))
    } finally {
      setGuardandoTipo(false)
    }
  }

  const guardarPlan = async () => {
    setGuardandoPlan(true)
    setError('')
    setMensaje('')
    try {
      await api.put(`/biblioteca/${bibliotecaId}`, { plan_partido_json: plan })
      setMensaje('Plan de partido guardado')
      setTimeout(() => setMensaje(''), 2500)
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el plan de partido'))
    } finally {
      setGuardandoPlan(false)
    }
  }

  return (
    <div className="card seccion" style={{ marginTop: 16 }}>
      <h3>Análisis</h3>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Este análisis es de:</label>
        <div className="modo-toggle">
          <button
            type="button"
            className={`btn btn-sm ${analisisTipo === 'propio' ? 'btn-primary' : 'btn-ghost'}`}
            disabled={guardandoTipo}
            onClick={() => elegirTipo('propio')}
          >
            Propio
          </button>
          <button
            type="button"
            className={`btn btn-sm ${analisisTipo === 'rival' ? 'btn-primary' : 'btn-ghost'}`}
            disabled={guardandoTipo}
            onClick={() => elegirTipo('rival')}
          >
            Rival
          </button>
        </div>
      </div>

      {analisisTipo === 'rival' && (
        <>
          <hr className="divisor" />
          <h4 className="subtitulo">Plan de partido</h4>

          <div className="modo-toggle" style={{ marginBottom: 14 }}>
            <button
              type="button"
              className={`btn btn-sm ${modoVista === 'armado' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setModoVista('armado')}
            >
              Armar en la app
            </button>
            <button
              type="button"
              className={`btn btn-sm ${modoVista === 'archivo' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setModoVista('archivo')}
            >
              Subir PDF
            </button>
          </div>

          {modoVista === 'armado' ? (
            <>
              <p className="texto-muted">
                Dibujá y describí posicionamientos, esquemas, salidas, presiones, ABP, etc. Un cuadro por fase o idea.
              </p>

              <PlanPartidoEditor value={plan} onChange={setPlan} editable />

              {mensaje && <div className="alert alert-success" style={{ marginTop: 12 }}>{mensaje}</div>}

              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={guardarPlan} disabled={guardandoPlan}>
                {guardandoPlan ? <span className="spinner" /> : 'Guardar plan de partido'}
              </button>
            </>
          ) : (
            <>
              <p className="texto-muted">Subí el PDF con el análisis ya armado por el analista de video.</p>

              {analisisModo === 'archivo' && analisisPdfNombre && (
                <p style={{ marginBottom: 10 }}>
                  Archivo actual: <strong>{analisisPdfNombre}</strong>{' '}
                  <a
                    href={`${API_BASE}/api/biblioteca/${bibliotecaId}/analisis-pdf/archivo?token=${localStorage.getItem('token')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver PDF ↗
                  </a>
                </p>
              )}

              <div className="field">
                <label>Archivo PDF</label>
                <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files[0])} />
              </div>

              <button className="btn btn-primary btn-sm" onClick={subirPdf} disabled={subiendoPdf}>
                {subiendoPdf ? <span className="spinner" /> : 'Subir PDF'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

function SeccionVideos({ bibliotecaId, videos, onVideoAgregado }) {
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
        Object.entries(form).forEach(([clave, valor]) => {
          if (clave !== 'url_video' && valor) datos.append(clave, valor)
        })
        datos.append('video', archivo)
        await api.post(`/biblioteca/${bibliotecaId}/videos`, datos)
      } else {
        const payload = { ...form }
        delete payload.url_video
        await api.post(`/biblioteca/${bibliotecaId}/videos`, { ...payload, url_video: form.url_video })
      }
      setForm(VIDEO_VACIO)
      setArchivo(null)
      onVideoAgregado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo agregar el video'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion">
      <h3>Videos</h3>

      <div className="video-existentes">
        {videos.length === 0 && <p className="texto-muted">Todavía no hay videos en esta publicación.</p>}
        {videos.map((v) => (
          <VideoConDiagnostico key={v.id} video={v} />
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
          {enviando ? <span className="spinner" /> : 'Agregar video'}
        </button>
      </form>
    </div>
  )
}

// Acceso directo al video (link o archivo) para el cuerpo técnico, sin
// tener que pasar por el reporte de seguimiento: Biblioteca también
// funciona como base de datos de partidos/análisis, y ese acceso debe
// existir tanto para jugadores (ya lo tienen) como para el CT.
function VideoExistente({ video }) {
  const abrirArchivo = () => {
    const token = localStorage.getItem('token')
    window.open(`${API_BASE}/api/biblioteca/videos/${video.id}/archivo?token=${token}`, '_blank')
  }

  const contenido = (
    <>
      <span className="video-existente-tipo">{video.tipo === 'archivo' ? '📁' : '🔗'}</span>
      <div>
        <strong>{video.titulo}</strong>
        {video.descripcion && <div className="texto-muted">{video.descripcion}</div>}
      </div>
    </>
  )

  if (video.tipo === 'link') {
    return (
      <a className="video-existente" href={video.url_video} target="_blank" rel="noreferrer">
        {contenido}
      </a>
    )
  }

  return (
    <button type="button" className="video-existente video-existente-boton" onClick={abrirArchivo}>
      {contenido}
    </button>
  )
}

// Envuelve VideoExistente con el toggle de diagnóstico táctico por IA
// (colapsado por defecto), mismo patrón que "Ver seguimiento" en
// EntrenamientosExtra (JugadorPreparacionFisica.jsx).
function VideoConDiagnostico({ video }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="video-item-wrap">
      <VideoExistente video={video} />
      <button type="button" className="btn btn-ghost btn-sm video-ia-toggle" onClick={() => setAbierto(!abierto)}>
        {abierto ? 'Ocultar diagnóstico IA' : 'Diagnóstico táctico con IA'}
      </button>
      {abierto && <DiagnosticoVideoIA videoId={video.id} />}
    </div>
  )
}

// Diagnóstico táctico automático generado por IA a partir del video: lee el
// historial (se pueden generar varias veces, se acumulan) y permite pedir
// uno nuevo. No hay progreso real (no hay job en background): solo un
// spinner y un aviso de que puede tardar varios minutos con un partido
// completo, mismo criterio ya usado en ImportarGpsPanel/
// ImportarEstadisticasPartidoPanel.
function DiagnosticoVideoIA({ videoId }) {
  const [diagnosticos, setDiagnosticos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/biblioteca/videos/${videoId}/diagnostico-ia`)
      .then(({ data }) => setDiagnosticos(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el historial')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [videoId])

  const generar = async () => {
    if (
      !window.confirm(
        'Analizar este video con IA puede tardar varios minutos si es un partido completo, y consume la cuota diaria de IA de la app. ¿Confirmás?'
      )
    ) {
      return
    }
    setError('')
    setGenerando(true)
    try {
      await api.post(`/biblioteca/videos/${videoId}/diagnostico-ia`)
      cargar()
    } catch (err) {
      const detalle = err?.response?.data?.error
      const mensaje = extraerError(err, 'No se pudo generar el diagnóstico')
      setError(detalle && detalle !== mensaje ? `${mensaje}: ${detalle}` : mensaje)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="video-ia-panel">
      {error && <div className="alert alert-error">{error}</div>}

      <button className="btn btn-primary btn-sm" onClick={generar} disabled={generando}>
        {generando ? <span className="spinner" /> : '+ Generar diagnóstico'}
      </button>
      {generando && (
        <p className="texto-muted">
          Analizando el video con IA. Con un partido completo puede tardar varios minutos — no cierres esta
          pantalla.
        </p>
      )}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && diagnosticos.length === 0 && (
        <p className="texto-muted">Todavía no se generó ningún diagnóstico para este video.</p>
      )}

      {!cargando && diagnosticos.length > 0 && (
        <div className="video-ia-lista">
          {diagnosticos.map((d) => (
            <div key={d.id} className="video-ia-item">
              <strong>{formatFechaHora(d.creado_en)}</strong>
              <p className="video-ia-texto">{d.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SeccionJugadores({ bibliotecaId, asignados, onAsignado }) {
  const [candidatos, setCandidatos] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/biblioteca/usuarios-jugadores').then(({ data }) => setCandidatos(data))
  }, [])

  const idsAsignados = new Set(asignados.map((a) => a.id))
  const disponibles = candidatos.filter((c) => !idsAsignados.has(c.id))

  const toggle = (id) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const asignar = async () => {
    if (seleccionados.length === 0) return
    setEnviando(true)
    setError('')
    try {
      await api.post(`/biblioteca/${bibliotecaId}/usuarios`, { usuarios: seleccionados })
      setSeleccionados([])
      onAsignado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo asignar'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion">
      <h3>Jugadores asignados</h3>

      <div className="jugadores-asignados">
        {asignados.length === 0 && <p className="texto-muted">Todavía no asignaste esta publicación a nadie.</p>}
        {asignados.map((a) => (
          <div className="jugador-chip" key={a.id}>
            {a.nombre}
          </div>
        ))}
      </div>

      <hr className="divisor" />

      <h4 className="subtitulo">Agregar jugadores</h4>
      {error && <div className="alert alert-error">{error}</div>}

      {disponibles.length === 0 ? (
        <p className="texto-muted">No hay más cuentas de jugador disponibles para asignar.</p>
      ) : (
        <div className="lista-candidatos">
          {disponibles.map((c) => (
            <label className="candidato" key={c.id}>
              <input
                type="checkbox"
                checked={seleccionados.includes(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span>
                {c.nombre} <span className="texto-muted">({c.email})</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary btn-sm"
        style={{ marginTop: 12 }}
        onClick={asignar}
        disabled={enviando || seleccionados.length === 0}
      >
        {enviando ? <span className="spinner" /> : `Asignar (${seleccionados.length})`}
      </button>
    </div>
  )
}

function SeccionReporte({ bibliotecaId }) {
  const [reporte, setReporte] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/biblioteca/${bibliotecaId}/reporte`)
      .then(({ data }) => setReporte(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el reporte')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [bibliotecaId])

  return (
    <div className="card seccion" style={{ marginTop: 20 }}>
      <div className="seccion-reporte-header">
        <h3>Seguimiento de visualizaciones</h3>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>
          Actualizar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && reporte.length === 0 && !error && (
        <p className="texto-muted">Asigná la publicación a algún jugador para empezar a ver el seguimiento.</p>
      )}

      {!cargando && reporte.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Estado</th>
              <th>Veces visto</th>
              <th>Última vez</th>
            </tr>
          </thead>
          <tbody>
            {reporte.map((fila) => (
              <tr key={fila.usuario_id}>
                <td>{fila.jugador}</td>
                <td>{fila.estado}</td>
                <td>{fila.veces_visto}</td>
                <td>
                  {fila.ultima_vez ? formatFechaHora(fila.ultima_vez) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
