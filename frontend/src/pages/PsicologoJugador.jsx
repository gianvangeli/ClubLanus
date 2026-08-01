import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import './AdminJugadorDetalle.css'
import './Psicologia.css'

const FORM_VACIO = { fecha: '', informe: '', plan_mejora: '' }

export default function PsicologoJugador() {
  const { jugadorId } = useParams()
  const [jugador, setJugador] = useState(null)
  const [informes, setInformes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargarJugador = () => {
    api.get(`/psicologia/jugador/${jugadorId}`).then(({ data }) => setJugador(data))
  }

  useEffect(cargarJugador, [jugadorId])

  const cargar = () => {
    setCargando(true)
    api
      .get(`/psicologia/jugador/${jugadorId}/informes`)
      .then(({ data }) => setInformes(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar los informes')))
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

    if (!form.fecha || !form.informe.trim()) {
      setError('Fecha e informe psicológico son obligatorios')
      return
    }

    setEnviando(true)
    try {
      await api.post(`/psicologia/jugador/${jugadorId}/informes`, form)
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar el informe'))
    } finally {
      setEnviando(false)
    }
  }

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  return (
    <div className="page">
      <Link to="/psicologia" className="btn btn-ghost btn-sm">
        ← Volver a mis jugadores
      </Link>

      <div className="seccion-especializada-header">
        <h1>Informes psicológicos{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
      </div>

      {jugador && <SemaforoPsicologico jugadorId={jugadorId} jugador={jugador} onActualizado={cargarJugador} />}

      <div className="card seccion">
        <div className="seccion-header">
          <h3>Historial de informes</h3>
          {!mostrarForm && (
            <button className="btn btn-primary btn-sm" onClick={abrirForm}>
              + Nuevo informe
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
              <label>Informe psicológico</label>
              <textarea rows={4} value={form.informe} onChange={onChange('informe')} />
            </div>
            <div className="field">
              <label>Plan de mejora</label>
              <textarea rows={3} value={form.plan_mejora} onChange={onChange('plan_mejora')} />
            </div>
            <div className="form-edicion-botones">
              <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
                {enviando ? <span className="spinner" /> : 'Guardar informe'}
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

        {!cargando && informes.length === 0 && (
          <p className="texto-muted">Todavía no hay informes cargados para este jugador.</p>
        )}

        {!cargando && informes.length > 0 && (
          <div className="informes-lista">
            {informes.map((i) => (
              <div key={i.id} className="informe-item">
                <span className="informe-item-fecha">{formatFecha(i.fecha)}</span>
                <div className="informe-texto">
                  <dt>Informe psicológico</dt>
                  <dd>{i.informe}</dd>
                </div>
                {i.plan_mejora && (
                  <div className="informe-texto">
                    <dt>Plan de mejora</dt>
                    <dd>{i.plan_mejora}</dd>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SEMAFOROS = [
  { valor: 'verde', etiqueta: 'Verde', color: '#0ca30c' },
  { valor: 'amarillo', etiqueta: 'Amarillo', color: '#fab219' },
  { valor: 'rojo', etiqueta: 'Rojo', color: '#d03b3b' },
]

function SemaforoPsicologico({ jugadorId, jugador, onActualizado }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const elegir = async (valor) => {
    setError('')
    setGuardando(true)
    try {
      const nuevo = jugador.semaforo_psicologico === valor ? null : valor
      await api.put(`/psicologia/jugador/${jugadorId}/semaforo`, { semaforo: nuevo })
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo actualizar el semáforo'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="card seccion">
      <h3>Semáforo del jugador</h3>
      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Solo vos lo definís. Lo va a ver el cuerpo técnico en la ficha del jugador y en el módulo General
        (los informes de arriba siguen siendo privados).
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        {SEMAFOROS.map((s) => (
          <button
            key={s.valor}
            type="button"
            disabled={guardando}
            onClick={() => elegir(s.valor)}
            className="btn btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: `2px solid ${s.color}`,
              background: jugador.semaforo_psicologico === s.valor ? s.color : 'transparent',
              color: jugador.semaforo_psicologico === s.valor ? '#fff' : 'var(--text)',
            }}
          >
            {s.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}
