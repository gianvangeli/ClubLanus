import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import './Calendario.css'

export default function Calendario() {
  const [microciclos, setMicrociclos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get('/calendario')
      .then(({ data }) => setMicrociclos(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar las semanas')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const eliminar = async (microciclo) => {
    if (!window.confirm(`¿Eliminar la semana del ${formatFecha(microciclo.fecha_inicio)} al ${formatFecha(microciclo.fecha_fin)}? Se borran todos sus bloques.`)) {
      return
    }
    try {
      await api.delete(`/calendario/${microciclo.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la semana'))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Calendario</h1>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setMostrarForm(true)}>
            + Nueva semana
          </button>
        )}
      </div>
      <p className="texto-muted">Planificación semanal: microciclos con partidos, entrenamientos y cargas físicas día por día.</p>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

      {mostrarForm && (
        <NuevaSemana
          onCreada={() => {
            setMostrarForm(false)
            cargar()
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && microciclos.length === 0 && !mostrarForm && (
        <div className="empty-state card" style={{ marginTop: 16 }}>
          <p>Todavía no hay semanas cargadas.</p>
        </div>
      )}

      {!cargando && microciclos.length > 0 && (
        <div className="cal-lista">
          {microciclos.map((m) => (
            <div key={m.id} className="card cal-item">
              <Link to={`/admin/calendario/${m.id}`} className="cal-item-link">
                <strong>{m.nombre || 'Semana'}</strong>
                <span className="texto-muted">
                  {formatFecha(m.fecha_inicio)} al {formatFecha(m.fecha_fin)}
                </span>
              </Link>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(m)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NuevaSemana({ onCreada, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const crear = async (e) => {
    e.preventDefault()
    setError('')

    if (!inicio || !fin) {
      setError('Elegí el inicio y el fin de la semana')
      return
    }
    if (fin < inicio) {
      setError('El fin de la semana no puede ser anterior al inicio')
      return
    }

    setEnviando(true)
    try {
      const { data } = await api.post('/calendario', { fecha_inicio: inicio, fecha_fin: fin, nombre })
      onCreada(data.microciclo_id)
    } catch (err) {
      setError(extraerError(err, 'No se pudo crear la semana'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card seccion cal-nueva-semana" onSubmit={crear} style={{ marginTop: 16 }}>
      <h3>Seleccioná tus fechas</h3>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="cal-fechas-row">
        <div className="field">
          <label>Inicio de semana</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </div>
        <div className="field">
          <label>Fin de semana</label>
          <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required />
        </div>
      </div>

      <div className="field">
        <label>Nombre (opcional)</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Semana 23" />
      </div>

      <div className="form-edicion-botones">
        <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Aplicar'}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
