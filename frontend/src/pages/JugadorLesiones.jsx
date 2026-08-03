import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { esFechaPasada, formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'
import './JugadorLesiones.css'

const FORM_VACIO = { fecha: '', lesion: '', diagnostico: '', proceso_recuperacion: '', fecha_alta: '' }

export default function JugadorLesiones() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)

  useEffect(() => {
    api.get(`/jugadores/${id}`).then(({ data }) => setJugador(data))
  }, [id])

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  return (
    <div className="page">
      <Link to={`/admin/jugadores/${id}`} className="btn btn-ghost btn-sm">
        ← Volver a la ficha
      </Link>

      <div className="seccion-especializada-header">
        <h1>Historial de lesiones{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="lesiones" />
      </div>

      <ListaLesiones jugadorId={id} />
    </div>
  )
}

function ListaLesiones({ jugadorId }) {
  const [lesiones, setLesiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/lesiones/jugador/${jugadorId}`)
      .then(({ data }) => setLesiones(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const abrirForm = () => {
    setForm({ ...FORM_VACIO, fecha: new Date().toISOString().slice(0, 10) })
    setError('')
    setMostrarForm(true)
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
      await api.post(`/lesiones/jugador/${jugadorId}`, form)
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar la lesión'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion lesiones-card">
      <div className="seccion-header">
        <h3>Lesiones</h3>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={abrirForm}>
            + Nueva lesión
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarForm && (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
          </div>
          <div className="field">
            <label>Lesión</label>
            <input
              value={form.lesion}
              onChange={onChange('lesion')}
              placeholder="Ej: Esguince de tobillo"
              required
            />
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
            <span className="texto-muted">
              Podés cargar la fecha real o una estimada: mientras no haya pasado, la lesión sigue figurando como activa.
            </span>
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar lesión'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && lesiones.length === 0 && (
        <p className="texto-muted">Todavía no hay lesiones cargadas para este jugador.</p>
      )}

      {!cargando && lesiones.length > 0 && (
        <div className="lesiones-lista">
          {lesiones.map((l) => (
            <Link key={l.id} to={`/admin/jugadores/${jugadorId}/lesiones/${l.id}`} className="lesion-item">
              <div className="lesion-item-info">
                <strong>{l.lesion}</strong>
                <span className="texto-muted">{formatFecha(l.fecha)}</span>
                {l.fecha_alta && esFechaPasada(l.fecha_alta) ? (
                  <span className="badge badge-success">Resuelta</span>
                ) : (
                  <span className="badge badge-danger">
                    Activa{l.fecha_alta ? ` — alta estimada ${formatFecha(l.fecha_alta)}` : ''}
                  </span>
                )}
              </div>
              {l.diagnostico && <p className="texto-muted lesion-item-preview">{l.diagnostico}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
