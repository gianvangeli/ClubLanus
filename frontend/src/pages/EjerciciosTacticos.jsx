import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import { ETIQUETAS_CATEGORIA, ETIQUETAS_FAVOR_CONTRA } from './categoriasEjerciciosTacticos'
import './Entrenamientos.css'
import './EjerciciosTacticos.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

// Ejercicios tácticos: dentro de "Entrenamientos desglosados" (exclusivo
// del cuerpo técnico), una biblioteca de videos cortos organizada en
// categorías fijas — algunas con sub-división (Rondos, Posesiones,
// Individuales, Acciones a balón parado) y el resto sin ella —, cada uno
// con su pizarra táctica (se arma en la ficha completa, no al crear: ver
// NuevoEjercicio). Acciones a balón parado además se clasifica A favor/
// En contra, independiente de la sub-categoría (córner/tiro libre).
export default function EjerciciosTacticos() {
  const [categorias, setCategorias] = useState(null)
  const [categoria, setCategoria] = useState(null)
  const [subcategoria, setSubcategoria] = useState(null)
  const [favorContra, setFavorContra] = useState(null)
  const [error, setError] = useState('')

  const cargarCategorias = () => {
    api
      .get('/ejercicios-tacticos/categorias')
      .then(({ data }) => {
        setCategorias(data)
        setCategoria((actual) => (actual && data[actual] ? actual : null))
      })
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar las categorías')))
  }

  useEffect(cargarCategorias, [])

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!categorias) {
    return (
      <div className="empty-state">
        <span className="spinner spinner-dark" />
      </div>
    )
  }

  const elegirCategoria = (c) => {
    setCategoria(c)
    setSubcategoria(categorias[c].subcategorias[0] || null)
    setFavorContra(c === 'pelota_parada' ? 'favor' : null)
  }

  if (!categoria) {
    return (
      <div className="et-grilla-categorias">
        {Object.keys(categorias).map((c) => (
          <button key={c} type="button" className="et-tarjeta-categoria" onClick={() => elegirCategoria(c)}>
            <strong>{ETIQUETAS_CATEGORIA[c] || c}</strong>
            <span className="entren-count-chip">{categorias[c].cantidad}</span>
          </button>
        ))}
      </div>
    )
  }

  const subcats = categorias[categoria].subcategorias

  return (
    <div>
      <button type="button" className="btn btn-ghost btn-sm et-volver-categorias" onClick={() => setCategoria(null)}>
        ← {ETIQUETAS_CATEGORIA[categoria] || categoria}
      </button>

      {subcats.length > 0 && (
        <div className="et-tabs et-subtabs">
          {subcats.map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${subcategoria === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSubcategoria(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {categoria === 'pelota_parada' && (
        <div className="et-tabs et-subtabs">
          {Object.entries(ETIQUETAS_FAVOR_CONTRA).map(([valor, etiqueta]) => (
            <button
              key={valor}
              className={`btn btn-sm ${favorContra === valor ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFavorContra(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      )}

      <ListaEjercicios
        categoria={categoria}
        subcategoria={subcategoria}
        favorContra={categoria === 'pelota_parada' ? favorContra : null}
        onCreado={cargarCategorias}
      />
    </div>
  )
}

function ListaEjercicios({ categoria, subcategoria, favorContra, onCreado }) {
  const { esCuerpoTecnico } = useAuth()
  const navigate = useNavigate()
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    const params = { categoria }
    if (subcategoria) params.subcategoria = subcategoria
    if (favorContra) params.favor_contra = favorContra
    api
      .get('/ejercicios-tacticos', { params })
      .then(({ data }) => setEjercicios(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar los ejercicios')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [categoria, subcategoria, favorContra])

  const etiquetaVacio =
    [subcategoria, favorContra && ETIQUETAS_FAVOR_CONTRA[favorContra]].filter(Boolean).join(' · ') ||
    ETIQUETAS_CATEGORIA[categoria] ||
    categoria

  return (
    <div>
      {esCuerpoTecnico && (
        <NuevoEjercicio
          categoria={categoria}
          subcategoria={subcategoria}
          favorContra={favorContra}
          onCreado={() => {
            cargar()
            onCreado?.()
          }}
        />
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && ejercicios.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no hay ejercicios cargados en &quot;{etiquetaVacio}&quot;.</p>
        </div>
      )}

      <div className="entren-lista">
        {ejercicios.map((ej) => (
          <div className="card entren-sesion" key={ej.id}>
            <button className="entren-sesion-header" onClick={() => navigate(`/entrenamientos/ejercicios-tacticos/${ej.id}`)}>
              <div className="entren-sesion-fecha">{ej.titulo}</div>
              <div className="entren-sesion-meta">
                {ej.fecha && <span className="texto-muted">{formatFecha(ej.fecha)}</span>}
                {ej.favor_contra && <span className="entren-count-chip">{ETIQUETAS_FAVOR_CONTRA[ej.favor_contra]}</span>}
                {ej.cantidad_jugadores && <span className="entren-count-chip">{ej.cantidad_jugadores} jugador(es)</span>}
                {ej.duracion_minutos && <span className="entren-count-chip">{ej.duracion_minutos}′</span>}
                <span className="entren-chevron">→</span>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const FORM_VACIO = { titulo: '', descripcion: '', cantidad_jugadores: '' }

// Alta mínima: fecha, título, cantidad de jugadores, descripción y video.
// La pizarra táctica (dibujada o subida) se arma después, en la ficha
// completa del ejercicio — antes se pedía acá también con el editor
// viejo (CanchaEditor), duplicando el trabajo apenas creado.
function NuevoEjercicio({ categoria, subcategoria, favorContra, onCreado }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...FORM_VACIO, fecha: hoyISO() })
  const [modo, setModo] = useState('archivo')
  const [archivo, setArchivo] = useState(null)
  const [urlVideo, setUrlVideo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (categoria === 'pelota_parada' && !favorContra) {
      setError('Elegí si la acción es A favor o En contra antes de registrar el ejercicio')
      return
    }
    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('categoria', categoria)
      if (subcategoria) datos.append('subcategoria', subcategoria)
      if (categoria === 'pelota_parada' && favorContra) datos.append('favor_contra', favorContra)
      datos.append('titulo', form.titulo)
      if (form.fecha) datos.append('fecha', form.fecha)
      if (form.descripcion) datos.append('descripcion', form.descripcion)
      if (form.cantidad_jugadores) datos.append('cantidad_jugadores', form.cantidad_jugadores)
      if (modo === 'archivo' && archivo) {
        datos.append('video', archivo)
      } else if (modo === 'link' && urlVideo.trim()) {
        datos.append('url_video', urlVideo.trim())
      }

      const { data } = await api.post('/ejercicios-tacticos', datos)
      onCreado()
      // El resto de la carga (contenido estructurado, pizarra táctica,
      // animación por escenas, etc.) se completa en la ficha completa del
      // ejercicio.
      navigate(`/entrenamientos/ejercicios-tacticos/${data.id}`)
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el ejercicio'))
    } finally {
      setEnviando(false)
    }
  }

  const tituloPaso =
    [subcategoria, categoria === 'pelota_parada' ? ETIQUETAS_FAVOR_CONTRA[favorContra] : null].filter(Boolean).join(' · ') ||
    ETIQUETAS_CATEGORIA[categoria] ||
    categoria

  return (
    <form className="card entren-form" onSubmit={onSubmit}>
      <h3>Nuevo ejercicio — {tituloPaso}</h3>

      {error && <div className="alert alert-error">{error}</div>}

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

      <button className="btn btn-primary" type="submit" disabled={enviando}>
        {enviando ? <span className="spinner" /> : 'Guardar ejercicio'}
      </button>
    </form>
  )
}
