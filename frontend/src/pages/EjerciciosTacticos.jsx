import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { API_BASE, extraerError } from '../api/client'
import CanchaEditor, { ESCENA_VACIA } from '../components/CanchaEditor'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import { formatFecha } from '../utils/fecha'
import './Entrenamientos.css'
import './EjerciciosTacticos.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const ETIQUETAS_CATEGORIA = { rondos: 'Rondos', pelota_parada: 'Pelota parada' }

// Ejercicios tácticos: dentro de "Entrenamientos desglosados", una
// biblioteca de videos cortos organizada en categorías y sub-categorías
// fijas (Rondos, Pelota parada), cada uno con su pizarra táctica.
// Si se pasa categoriaFija, se omite el selector de categoría y se muestra
// directamente esa categoría (así lo usa la pestaña de Entrenamientos).
export default function EjerciciosTacticos({ categoriaFija }) {
  const [categorias, setCategorias] = useState(null)
  const [categoria, setCategoria] = useState(categoriaFija || null)
  const [subcategoria, setSubcategoria] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/ejercicios-tacticos/categorias')
      .then(({ data }) => {
        setCategorias(data)
        const inicial = categoriaFija || Object.keys(data)[0]
        setCategoria(inicial)
        setSubcategoria(data[inicial]?.[0] || null)
      })
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar las categorías')))
  }, [categoriaFija])

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!categorias || !categoria) {
    return (
      <div className="empty-state">
        <span className="spinner spinner-dark" />
      </div>
    )
  }

  const cambiarCategoria = (c) => {
    setCategoria(c)
    setSubcategoria(categorias[c][0])
  }

  return (
    <div>
      {!categoriaFija && (
        <div className="et-tabs">
          {Object.keys(categorias).map((c) => (
            <button
              key={c}
              className={`btn btn-sm ${categoria === c ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => cambiarCategoria(c)}
            >
              {ETIQUETAS_CATEGORIA[c] || c}
            </button>
          ))}
        </div>
      )}

      <div className="et-tabs et-subtabs">
        {categorias[categoria].map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${subcategoria === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSubcategoria(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {subcategoria && <ListaEjercicios categoria={categoria} subcategoria={subcategoria} />}
    </div>
  )
}

function ListaEjercicios({ categoria, subcategoria }) {
  const { esCuerpoTecnico } = useAuth()
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierto, setAbierto] = useState(null)

  const cargar = () => {
    setCargando(true)
    setAbierto(null)
    api
      .get('/ejercicios-tacticos', { params: { categoria, subcategoria } })
      .then(({ data }) => setEjercicios(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar los ejercicios')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [categoria, subcategoria])

  return (
    <div>
      {esCuerpoTecnico && <NuevoEjercicio categoria={categoria} subcategoria={subcategoria} onCreado={cargar} />}

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && ejercicios.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no hay ejercicios cargados en &quot;{subcategoria}&quot;.</p>
        </div>
      )}

      <div className="entren-lista">
        {ejercicios.map((ej) => (
          <div className="card entren-sesion" key={ej.id}>
            <button className="entren-sesion-header" onClick={() => setAbierto(abierto === ej.id ? null : ej.id)}>
              <div className="entren-sesion-fecha">{ej.titulo}</div>
              <div className="entren-sesion-meta">
                {ej.fecha && (
                  <span className="texto-muted">
                    {formatFecha(ej.fecha)}
                  </span>
                )}
                {ej.cantidad_jugadores && <span className="entren-count-chip">{ej.cantidad_jugadores} jugador(es)</span>}
                <span className="entren-chevron">{abierto === ej.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {abierto === ej.id && (
              <DetalleEjercicio id={ej.id} esCuerpoTecnico={esCuerpoTecnico} onEliminado={cargar} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DetalleEjercicio({ id, esCuerpoTecnico, onEliminado }) {
  const [detalle, setDetalle] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/ejercicios-tacticos/${id}`)
      .then(({ data }) => setDetalle(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el ejercicio')))
  }, [id])

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este ejercicio? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/ejercicios-tacticos/${id}`)
      onEliminado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el ejercicio'))
    }
  }

  if (error) {
    return <div className="alert alert-error" style={{ margin: '0 20px 16px' }}>{error}</div>
  }

  if (!detalle) {
    return (
      <div className="empty-state">
        <span className="spinner spinner-dark" />
      </div>
    )
  }

  const token = localStorage.getItem('token')
  const idYouTube = detalle.video_tipo === 'link' ? extraerIdYouTube(detalle.video_url) : null

  return (
    <div className="entren-sesion-body">
      {detalle.descripcion && <p className="texto-muted" style={{ margin: '12px 0' }}>{detalle.descripcion}</p>}

      {detalle.video_tipo === 'archivo' ? (
        <video
          className="video-player"
          controls
          preload="metadata"
          src={`${API_BASE}/api/ejercicios-tacticos/${id}/archivo?token=${token}`}
        />
      ) : idYouTube ? (
        <YouTubePlayer videoId={idYouTube} />
      ) : detalle.video_tipo === 'link' ? (
        <a className="btn btn-ghost btn-sm" href={detalle.video_url} target="_blank" rel="noreferrer">
          Ver video externo ↗
        </a>
      ) : null}

      {detalle.dibujo_json && (
        <div className="et-pizarra-solo-lectura">
          <CanchaEditor value={detalle.dibujo_json} onChange={() => {}} editable={false} />
        </div>
      )}

      {esCuerpoTecnico && (
        <button className="btn btn-ghost btn-sm btn-danger" style={{ marginTop: 14 }} onClick={eliminar}>
          Eliminar ejercicio
        </button>
      )}
    </div>
  )
}

const FORM_VACIO = { titulo: '', descripcion: '', cantidad_jugadores: '' }

function NuevoEjercicio({ categoria, subcategoria, onCreado }) {
  const [form, setForm] = useState({ ...FORM_VACIO, fecha: hoyISO() })
  const [modo, setModo] = useState('archivo')
  const [archivo, setArchivo] = useState(null)
  const [urlVideo, setUrlVideo] = useState('')
  const [dibujo, setDibujo] = useState(ESCENA_VACIA)
  const [mostrarPizarra, setMostrarPizarra] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('categoria', categoria)
      datos.append('subcategoria', subcategoria)
      datos.append('titulo', form.titulo)
      if (form.fecha) datos.append('fecha', form.fecha)
      if (form.descripcion) datos.append('descripcion', form.descripcion)
      if (form.cantidad_jugadores) datos.append('cantidad_jugadores', form.cantidad_jugadores)
      if (modo === 'archivo' && archivo) {
        datos.append('video', archivo)
      } else if (modo === 'link' && urlVideo.trim()) {
        datos.append('url_video', urlVideo.trim())
      }
      const pizarraTieneContenido =
        dibujo.jugadores.length > 0 || dibujo.flechas.length > 0 || dibujo.figuras.length > 0
      if (pizarraTieneContenido) datos.append('dibujo_json', JSON.stringify(dibujo))

      await api.post('/ejercicios-tacticos', datos)
      setMensaje('Ejercicio guardado correctamente')
      setForm({ ...FORM_VACIO, fecha: hoyISO() })
      setArchivo(null)
      setUrlVideo('')
      setDibujo(ESCENA_VACIA)
      setMostrarPizarra(false)
      onCreado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el ejercicio'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card entren-form" onSubmit={onSubmit}>
      <h3>Nuevo ejercicio — {subcategoria}</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="entren-form-row">
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={form.fecha} onChange={onChange('fecha')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Título</label>
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
        <textarea rows={3} value={form.descripcion} onChange={onChange('descripcion')} />
      </div>

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

      {modo === 'archivo' ? (
        <div className="field">
          <label>Video</label>
          <input type="file" accept="video/*" onChange={(e) => setArchivo(e.target.files[0] || null)} />
          {archivo && <span className="texto-muted">{archivo.name}</span>}
        </div>
      ) : (
        <div className="field">
          <label>URL del video</label>
          <input value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} />
        </div>
      )}

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => setMostrarPizarra((v) => !v)}
      >
        {mostrarPizarra ? '− Ocultar' : '+ Agregar'} pizarra táctica
      </button>

      {mostrarPizarra && <CanchaEditor value={dibujo} onChange={setDibujo} editable />}

      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Guardar ejercicio'}
      </button>
    </form>
  )
}
