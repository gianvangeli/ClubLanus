import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import './AdminBibliotecaDetalle.css'

const VIDEO_VACIO = {
  titulo: '',
  descripcion: '',
  categoria_video: 'partido',
  rival: '',
  resultado: '',
  duracion_segundos: '',
  fecha_video: '',
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
        <span className={`badge ${publicacion.estado === 'publicado' ? 'badge-success' : 'badge-warning'}`}>
          {publicacion.estado}
        </span>
      </div>

      <div className="detalle-grid">
        <SeccionVideos
          bibliotecaId={id}
          videos={publicacion.videos}
          onVideoAgregado={cargarPublicacion}
        />
        <SeccionJugadores bibliotecaId={id} asignados={publicacion.jugadores_asignados} onAsignado={cargarPublicacion} />
      </div>

      <SeccionReporte bibliotecaId={id} />
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
          <div className="video-existente" key={v.id}>
            <span className="video-existente-tipo">{v.tipo === 'archivo' ? '📁' : '🔗'}</span>
            <div>
              <strong>{v.titulo}</strong>
              <div className="texto-muted">{formatearCategoria(v.categoria_video)}</div>
            </div>
          </div>
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

        <div className="form-row-3">
          <div className="field">
            <label>Categoría</label>
            <select value={form.categoria_video} onChange={onChange('categoria_video')}>
              <option value="partido">Partido</option>
              <option value="entrenamiento">Entrenamiento</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <div className="field">
            <label>Rival</label>
            <input value={form.rival} onChange={onChange('rival')} />
          </div>
          <div className="field">
            <label>Resultado</label>
            <input value={form.resultado} onChange={onChange('resultado')} placeholder="2-1" />
          </div>
        </div>

        <div className="form-row-3">
          <div className="field">
            <label>Duración (segundos)</label>
            <input type="number" min="0" value={form.duracion_segundos} onChange={onChange('duracion_segundos')} />
          </div>
          <div className="field">
            <label>Fecha del video</label>
            <input type="date" value={form.fecha_video} onChange={onChange('fecha_video')} />
          </div>
          {modo === 'link' && (
            <div className="field">
              <label>URL del video</label>
              <input value={form.url_video} onChange={onChange('url_video')} placeholder="https://..." required />
            </div>
          )}
        </div>

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
                  {fila.ultima_vez
                    ? new Date(fila.ultima_vez).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function formatearCategoria(cat) {
  const nombres = { partido: 'Partido', entrenamiento: 'Entrenamiento', individual: 'Individual' }
  return nombres[cat] || cat
}
