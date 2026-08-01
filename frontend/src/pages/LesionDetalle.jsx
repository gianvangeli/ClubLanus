import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { aInputDate, formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'
import './JugadorLesiones.css'

const TIPOS_DOCUMENTO = [
  { valor: 'diagnostico', etiqueta: 'Diagnóstico médico' },
  { valor: 'resonancia', etiqueta: 'Resonancia' },
  { valor: 'estudio', etiqueta: 'Estudio' },
  { valor: 'informe', etiqueta: 'Informe médico' },
  { valor: 'otro', etiqueta: 'Otro documento' },
]

const etiquetaTipo = (valor) => TIPOS_DOCUMENTO.find((t) => t.valor === valor)?.etiqueta || valor

export default function LesionDetalle() {
  const { id, lesionId } = useParams()
  const navigate = useNavigate()
  const [jugador, setJugador] = useState(null)
  const [lesion, setLesion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/jugadores/${id}`).then(({ data }) => setJugador(data))
  }, [id])

  const cargarLesion = () => {
    api
      .get(`/lesiones/${lesionId}`)
      .then(({ data }) => setLesion(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la lesión')))
      .finally(() => setCargando(false))
  }

  useEffect(cargarLesion, [lesionId])

  const eliminarLesion = async () => {
    if (!window.confirm('¿Eliminar esta lesión y todos sus archivos? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await api.delete(`/lesiones/${lesionId}`)
      navigate(`/admin/jugadores/${id}/lesiones`)
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la lesión'))
    }
  }

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error && !lesion) {
    return (
      <div className="page">
        <Link to={`/admin/jugadores/${id}/lesiones`} className="btn btn-ghost btn-sm">
          ← Volver a lesiones
        </Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to={`/admin/jugadores/${id}/lesiones`} className="btn btn-ghost btn-sm">
        ← Volver a lesiones
      </Link>

      <div className="seccion-especializada-header">
        <h1>{lesion.lesion}{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="lesiones" />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="detalle-grid">
        <InfoLesion lesion={lesion} onActualizado={cargarLesion} onEliminar={eliminarLesion} />
        <ArchivosLesion lesion={lesion} onActualizado={cargarLesion} />
      </div>
    </div>
  )
}

function InfoLesion({ lesion, onActualizado, onEliminar }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ fecha: '', lesion: '', diagnostico: '', proceso_recuperacion: '', fecha_alta: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const empezarEdicion = () => {
    setForm({
      fecha: aInputDate(lesion.fecha),
      lesion: lesion.lesion || '',
      diagnostico: lesion.diagnostico || '',
      proceso_recuperacion: lesion.proceso_recuperacion || '',
      fecha_alta: aInputDate(lesion.fecha_alta) || '',
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.fecha || !form.lesion.trim()) {
      setError('Fecha y lesión son obligatorios')
      return
    }

    setEnviando(true)
    try {
      await api.put(`/lesiones/${lesion.id}`, form)
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
        <h3>Datos de la lesión</h3>
        {!editando && (
          <button className="btn btn-ghost btn-sm" onClick={empezarEdicion}>
            Editar
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!editando ? (
        <>
          <dl className="info-lista">
            <Dato label="Fecha" valor={formatFecha(lesion.fecha)} />
            <Dato label="Lesión" valor={lesion.lesion} />
            <Dato
              label="Estado"
              valor={
                lesion.fecha_alta ? (
                  <span className="badge badge-success">Resuelta — alta el {formatFecha(lesion.fecha_alta)}</span>
                ) : (
                  <span className="badge badge-danger">Activa</span>
                )
              }
            />
          </dl>
          <div className="lesion-texto-libre">
            <dt>Diagnóstico</dt>
            <dd>{lesion.diagnostico || <span className="texto-muted">—</span>}</dd>
          </div>
          <div className="lesion-texto-libre">
            <dt>Proceso de recuperación</dt>
            <dd>{lesion.proceso_recuperacion || <span className="texto-muted">—</span>}</dd>
          </div>
        </>
      ) : (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
          </div>
          <div className="field">
            <label>Lesión</label>
            <input value={form.lesion} onChange={onChange('lesion')} required />
          </div>
          <div className="field">
            <label>Diagnóstico</label>
            <textarea rows={3} value={form.diagnostico} onChange={onChange('diagnostico')} />
          </div>
          <div className="field">
            <label>Proceso de recuperación</label>
            <textarea rows={3} value={form.proceso_recuperacion} onChange={onChange('proceso_recuperacion')} />
          </div>
          <div className="field">
            <label>Fecha de alta médica</label>
            <input type="date" value={form.fecha_alta} onChange={onChange('fecha_alta')} />
            <span className="texto-muted">Dejar vacío mientras la lesión esté activa.</span>
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

      <button className="btn btn-ghost btn-sm btn-danger" onClick={onEliminar}>
        Eliminar lesión
      </button>
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

function ArchivosLesion({ lesion, onActualizado }) {
  const [tipoDocumento, setTipoDocumento] = useState('diagnostico')
  const [archivos, setArchivos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (archivos.length === 0) {
      setError('Elegí uno o más archivos')
      return
    }

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('tipo_documento', tipoDocumento)
      archivos.forEach((archivo) => datos.append('archivos', archivo))
      await api.post(`/lesiones/${lesion.id}/archivos`, datos)
      setArchivos([])
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudieron subir los archivos'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (archivo) => {
    if (!window.confirm(`¿Eliminar "${archivo.nombre_archivo}"?`)) {
      return
    }

    try {
      await api.delete(`/lesiones/${lesion.id}/archivos/${archivo.id}`)
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el archivo'))
    }
  }

  return (
    <div className="card seccion">
      <h3>Archivos</h3>

      {error && <div className="alert alert-error">{error}</div>}

      {lesion.archivos.length === 0 ? (
        <p className="texto-muted">Todavía no hay archivos subidos para esta lesión.</p>
      ) : (
        <div className="lesion-archivos-lista">
          {lesion.archivos.map((a) => (
            <div className="lesion-archivo-item" key={a.id}>
              <div className="lesion-archivo-info">
                <span className="badge badge-warning">{etiquetaTipo(a.tipo_documento)}</span>
                <span>{a.nombre_archivo}</span>
              </div>
              <div className="cf-item-acciones">
                <a
                  className="btn btn-ghost btn-sm"
                  href={`${API_BASE}/api/lesiones/${lesion.id}/archivos/${a.id}?token=${token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver ↗
                </a>
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(a)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="divisor" />

      <form className="form-video" onSubmit={onSubmit}>
        <div className="field">
          <label>Tipo de documento</label>
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Archivos (PDF, imagen o Word, podés elegir varios)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            multiple
            onChange={(e) => setArchivos(Array.from(e.target.files))}
          />
          {archivos.length > 0 && (
            <span className="texto-muted">{archivos.length} archivo(s) seleccionado(s)</span>
          )}
        </div>
        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Subir archivo(s)'}
        </button>
      </form>
    </div>
  )
}
