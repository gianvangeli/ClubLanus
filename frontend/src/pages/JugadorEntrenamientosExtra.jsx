import { useEffect, useState } from 'react'
import api, { API_BASE, extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import GraficoTendencia from '../components/GraficoTendencia'
import './JugadorEntrenamientosExtra.css'

const METRICAS = [
  { valor: 'peso_kg', etiqueta: 'Peso (kg)', unidad: 'kg' },
  { valor: 'duracion_min', etiqueta: 'Duración (min)', unidad: 'min' },
]

export default function JugadorEntrenamientosExtra() {
  const [jugadorId, setJugadorId] = useState(null)
  const [planes, setPlanes] = useState([])
  const [progreso, setProgreso] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [metrica, setMetrica] = useState('peso_kg')

  const cargar = () => {
    setCargando(true)
    Promise.all([
      api.get('/jugadores/mis-entrenamientos-extra'),
      api.get('/jugadores/mi-progreso-entrenamiento-extra'),
    ])
      .then(([planesRes, progresoRes]) => {
        setJugadorId(planesRes.data.jugador_id)
        setPlanes(planesRes.data.planes)
        setProgreso(progresoRes.data)
      })
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar tus entrenamientos extra')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const metricaActiva = METRICAS.find((m) => m.valor === metrica)
  const puntosProgreso = progreso
    .map((r) => ({ fecha: r.fecha, valor: r[metrica] === null || r[metrica] === undefined ? null : Number(r[metrica]) }))
    .filter((p) => typeof p.valor === 'number' && !Number.isNaN(p.valor))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Entrenamientos extra</h1>
          <p>Los planes que te asignó el cuerpo técnico. Registrá tu progreso cada vez que los hagas.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && !error && (
        <>
          {progreso.length >= 2 && (
            <div className="card seccion" style={{ marginBottom: 16 }}>
              <h3>Tu progreso</h3>
              <div className="field" style={{ maxWidth: 260, marginBottom: 12 }}>
                <label>Métrica</label>
                <select value={metrica} onChange={(e) => setMetrica(e.target.value)}>
                  {METRICAS.map((m) => (
                    <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
                  ))}
                </select>
              </div>
              <GraficoTendencia puntos={puntosProgreso} etiqueta={metricaActiva.etiqueta} unidad={metricaActiva.unidad} />
            </div>
          )}

          {planes.length === 0 && (
            <div className="empty-state card">
              <p>Todavía no tenés entrenamientos extra asignados.</p>
            </div>
          )}

          <div className="eex-lista">
            {planes.map((p) => (
              <PlanExtra key={p.id} plan={p} jugadorId={jugadorId} onCambio={cargar} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PlanExtra({ plan, jugadorId, onCambio }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ fecha: '', peso_kg: '', duracion_min: '', horario: '', observaciones: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const cargarRegistros = () => {
    setCargando(true)
    api
      .get(`/jugadores/planes-entrenamiento-extra/${plan.id}/registros`)
      .then(({ data }) => setRegistros(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargarRegistros, [plan.id])

  const abrirForm = () => {
    setForm({ fecha: new Date().toISOString().slice(0, 10), peso_kg: '', duracion_min: '', horario: '', observaciones: '' })
    setError('')
    setMostrarForm(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.fecha) {
      setError('La fecha es obligatoria')
      return
    }

    setEnviando(true)
    try {
      await api.post(`/jugadores/planes-entrenamiento-extra/${plan.id}/registros`, {
        fecha: form.fecha,
        peso_kg: form.peso_kg || null,
        duracion_min: form.duracion_min || null,
        horario: form.horario || null,
        observaciones: form.observaciones || null,
      })
      setMostrarForm(false)
      cargarRegistros()
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar el progreso'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (registro) => {
    if (!window.confirm(`¿Eliminar el registro del ${formatFecha(registro.fecha)}?`)) return
    try {
      await api.delete(`/jugadores/planes-entrenamiento-extra/registros/${registro.id}`)
      cargarRegistros()
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el registro'))
    }
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Plan del {formatFecha(plan.fecha)}</h3>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={abrirForm}>
            + Registrar progreso
          </button>
        )}
      </div>

      {plan.informe && <p className="texto-muted">{plan.informe}</p>}
      {plan.nombre_archivo && jugadorId && (
        <a
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 8 }}
          href={`${API_BASE}/api/jugadores/${jugadorId}/planes-entrenamiento-extra/${plan.id}/archivo?token=${token}`}
          target="_blank"
          rel="noreferrer"
        >
          Ver archivo del plan ↗
        </a>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: 10 }}>{error}</div>}

      {mostrarForm && (
        <form className="form-edicion" onSubmit={guardar} style={{ marginTop: 12 }}>
          <div className="eex-form-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
            </div>
            <div className="field">
              <label>Peso usado (kg)</label>
              <input type="text" inputMode="decimal" value={form.peso_kg} onChange={onChange('peso_kg')} />
            </div>
            <div className="field">
              <label>Duración (min)</label>
              <input type="text" inputMode="numeric" value={form.duracion_min} onChange={onChange('duracion_min')} />
            </div>
            <div className="field">
              <label>Horario</label>
              <input value={form.horario} onChange={onChange('horario')} placeholder="Ej: 18:00" />
            </div>
          </div>
          <div className="field">
            <label>Observaciones</label>
            <textarea rows={2} value={form.observaciones} onChange={onChange('observaciones')} />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!cargando && registros.length > 0 && (
        <div className="tabla-scroll" style={{ marginTop: 14 }}>
          <table className="tabla tabla-compacta">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Peso (kg)</th>
                <th>Duración (min)</th>
                <th>Horario</th>
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{formatFecha(r.fecha)}</td>
                  <td>{r.peso_kg ?? '—'}</td>
                  <td>{r.duracion_min ?? '—'}</td>
                  <td>{r.horario || '—'}</td>
                  <td className="texto-muted">{r.observaciones || '—'}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(r)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && registros.length === 0 && !mostrarForm && (
        <p className="texto-muted" style={{ marginTop: 12 }}>Todavía no registraste progreso de este plan.</p>
      )}
    </div>
  )
}
