import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import './AdminJugadorDetalle.css'

const CAMPOS_VACIOS = {
  nombre: '',
  apellido: '',
  edad: '',
  altura: '',
  posicion: '',
  categoria: '',
  division_nombre: '',
}

export default function AdminJugadorDetalle() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarJugador = () => {
    api
      .get(`/jugadores/${id}`)
      .then(({ data }) => setJugador(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el jugador')))
      .finally(() => setCargando(false))
  }

  useEffect(cargarJugador, [id])

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error && !jugador) {
    return (
      <div className="page">
        <Link to="/admin/jugadores" className="btn btn-ghost btn-sm">
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
      <Link to="/admin/jugadores" className="btn btn-ghost btn-sm">
        ← Volver al plantel
      </Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>
            {jugador.nombre} {jugador.apellido}
          </h1>
          <p>Ficha del jugador</p>
        </div>
      </div>

      <div className="detalle-grid">
        <InfoJugador jugador={jugador} onActualizado={cargarJugador} />
        <VideosJugador jugadorId={id} />
      </div>
    </div>
  )
}

function InfoJugador({ jugador, onActualizado }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(CAMPOS_VACIOS)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const empezarEdicion = () => {
    setForm({
      nombre: jugador.nombre || '',
      apellido: jugador.apellido || '',
      edad: jugador.edad ?? '',
      altura: jugador.altura ?? '',
      posicion: jugador.posicion || '',
      categoria: jugador.categoria || '',
      division_nombre: jugador.division_nombre || '',
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    const edad = aNumero(form.edad)
    const altura = aNumero(form.altura)
    if (edad === undefined || altura === undefined) {
      setError('Edad y altura tienen que ser números (podés usar coma o punto)')
      return
    }

    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugador.id}`, {
        nombre: form.nombre,
        apellido: form.apellido,
        edad,
        altura,
        posicion: form.posicion,
        categoria: form.categoria,
        division_nombre: form.division_nombre,
      })
      setEditando(false)
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Info jugador</h3>
        {!editando && (
          <button className="btn btn-ghost btn-sm" onClick={empezarEdicion}>
            Editar
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!editando ? (
        <dl className="info-lista">
          <Dato label="Apellido" valor={jugador.apellido} />
          <Dato label="Nombre" valor={jugador.nombre} />
          <Dato label="Edad" valor={jugador.edad ? `${jugador.edad} años` : null} />
          <Dato label="Altura" valor={jugador.altura ? `${jugador.altura} m` : null} />
          <Dato label="Posición" valor={jugador.posicion} />
          <Dato label="Categoría" valor={jugador.categoria} />
          <Dato label="División" valor={jugador.division_nombre} />
        </dl>
      ) : (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="field">
            <label>Nombre</label>
            <input value={form.nombre} onChange={onChange('nombre')} required />
          </div>
          <div className="field">
            <label>Apellido</label>
            <input value={form.apellido} onChange={onChange('apellido')} required />
          </div>
          <div className="field">
            <label>Edad</label>
            <input type="text" inputMode="numeric" value={form.edad} onChange={onChange('edad')} />
          </div>
          <div className="field">
            <label>Altura (m)</label>
            <input type="text" inputMode="decimal" value={form.altura} onChange={onChange('altura')} />
          </div>
          <div className="field">
            <label>Posición</label>
            <input value={form.posicion} onChange={onChange('posicion')} placeholder="Ej: Delantero" />
          </div>
          <div className="field">
            <label>Categoría</label>
            <input value={form.categoria} onChange={onChange('categoria')} placeholder="Ej: Primera" />
          </div>
          <div className="field">
            <label>División</label>
            <input value={form.division_nombre} onChange={onChange('division_nombre')} />
          </div>

          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <hr className="divisor" />

      <ComposicionCorporal jugador={jugador} onActualizado={onActualizado} />
    </div>
  )
}

function Dato({ label, valor }) {
  return (
    <div className="info-dato">
      <dt>{label}</dt>
      <dd>{valor || <span className="texto-muted">—</span>}</dd>
    </div>
  )
}

function ComposicionCorporal({ jugador, onActualizado }) {
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ fecha: '', peso: '', grasa_corporal_pct: '', observaciones: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargarHistorial = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugador.id}/composicion`)
      .then(({ data }) => setHistorial(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargarHistorial, [jugador.id])

  const abrirForm = () => {
    setForm({ fecha: new Date().toISOString().slice(0, 10), peso: '', grasa_corporal_pct: '', observaciones: '' })
    setError('')
    setMostrarForm(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    const peso = aNumero(form.peso)
    const grasa = aNumero(form.grasa_corporal_pct)
    if (!peso) {
      setError('El peso es obligatorio y tiene que ser un número')
      return
    }
    if (grasa === undefined) {
      setError('El % de grasa corporal tiene que ser un número (podés usar coma o punto)')
      return
    }

    setEnviando(true)
    try {
      await api.post(`/jugadores/${jugador.id}/composicion`, {
        fecha: form.fecha,
        peso,
        grasa_corporal_pct: grasa,
        observaciones: form.observaciones,
      })
      setMostrarForm(false)
      cargarHistorial()
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar la medición'))
    } finally {
      setEnviando(false)
    }
  }

  const ultima = historial[0]

  return (
    <div className="composicion">
      <div className="composicion-actual">
        <div>
          <span className="composicion-label">Peso</span>
          <div className="composicion-valor">
            {jugador.peso ? `${jugador.peso} kg` : 'Sin datos'}
            {ultima?.grasa_corporal_pct != null && (
              <span className="composicion-grasa"> · {ultima.grasa_corporal_pct}% grasa</span>
            )}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirForm}>
          + Cargar medición
        </button>
      </div>

      {mostrarForm && (
        <form className="form-composicion" onSubmit={guardar}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-composicion-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
            </div>
            <div className="field">
              <label>Peso (kg)</label>
              <input type="text" inputMode="decimal" placeholder="Ej: 75,5" value={form.peso} onChange={onChange('peso')} required />
            </div>
            <div className="field">
              <label>% Grasa corporal</label>
              <input type="text" inputMode="decimal" placeholder="Ej: 12,5" value={form.grasa_corporal_pct} onChange={onChange('grasa_corporal_pct')} />
            </div>
          </div>
          <div className="field">
            <label>Observaciones</label>
            <input value={form.observaciones} onChange={onChange('observaciones')} />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar medición'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!cargando && historial.length > 0 && (
        <table className="tabla tabla-compacta">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso</th>
              <th>% Grasa</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                <td>{h.peso} kg</td>
                <td>{h.grasa_corporal_pct != null ? `${h.grasa_corporal_pct}%` : '—'}</td>
                <td className="texto-muted">{h.observaciones || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function VideosJugador({ jugadorId }) {
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modo, setModo] = useState('archivo')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [urlVideo, setUrlVideo] = useState('')
  const [archivos, setArchivos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/videos`)
      .then(({ data }) => setVideos(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      if (modo === 'archivo') {
        if (archivos.length === 0) {
          setError('Elegí uno o más archivos de video')
          setEnviando(false)
          return
        }
        const datos = new FormData()
        if (titulo) datos.append('titulo', titulo)
        datos.append('descripcion', descripcion)
        archivos.forEach((archivo) => datos.append('videos', archivo))
        await api.post(`/jugadores/${jugadorId}/videos`, datos)
      } else {
        if (!urlVideo.trim()) {
          setError('Pegá al menos un link de video')
          setEnviando(false)
          return
        }
        await api.post(`/jugadores/${jugadorId}/videos`, {
          titulo: titulo || undefined,
          descripcion,
          url_video: urlVideo,
        })
      }
      setTitulo('')
      setDescripcion('')
      setUrlVideo('')
      setArchivos([])
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo agregar el video'))
    } finally {
      setEnviando(false)
    }
  }

  const token = localStorage.getItem('token')

  return (
    <div className="card seccion">
      <h3>Videos</h3>

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && videos.length === 0 && (
        <p className="texto-muted">Todavía no hay videos cargados para este jugador.</p>
      )}

      <div className="video-jugador-lista">
        {videos.map((v) => (
          <div className="video-jugador-item" key={v.id}>
            <div className="video-jugador-item-header">
              <strong>{v.titulo}</strong>
              <span className="badge badge-warning">{v.tipo === 'archivo' ? 'Archivo' : 'Link'}</span>
            </div>
            {v.descripcion && <p className="texto-muted">{v.descripcion}</p>}
            {v.tipo === 'archivo' ? (
              <video className="video-player" controls preload="metadata" src={`/api/biblioteca/videos/${v.id}/archivo?token=${token}`} />
            ) : (
              <a className="btn btn-ghost btn-sm" href={v.url_video} target="_blank" rel="noreferrer">
                Ver video externo ↗
              </a>
            )}
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
          <label>Título {modo === 'archivo' ? '(opcional si subís varios)' : '(opcional)'}</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={modo === 'archivo' ? 'Se usa el nombre del archivo si lo dejás vacío' : 'Se usa el link si lo dejás vacío'}
          />
        </div>
        <div className="field">
          <label>Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        {modo === 'archivo' ? (
          <div className="field" key="archivo">
            <label>Archivos de video (cualquier formato, podés elegir varios)</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => setArchivos(Array.from(e.target.files))}
            />
            {archivos.length > 0 && (
              <span className="texto-muted">{archivos.length} archivo(s) seleccionado(s)</span>
            )}
          </div>
        ) : (
          <div className="field" key="link">
            <label>URLs del video (una por línea si son varios)</label>
            <textarea
              rows={3}
              value={urlVideo}
              onChange={(e) => setUrlVideo(e.target.value)}
              placeholder={'https://...\nhttps://...'}
            />
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Agregar video'}
        </button>
      </form>
    </div>
  )
}
