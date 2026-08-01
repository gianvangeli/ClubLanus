import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import NutricionTabs from '../components/NutricionTabs'
import './AdminJugadorDetalle.css'
import './JugadorNutricion.css'

export default function JugadorNutricionDieta() {
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
        <h1>Nutrición del jugador{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="nutricion" />
      </div>

      <NutricionTabs jugadorId={id} activa="dieta" />

      <Dieta jugadorId={id} />
    </div>
  )
}

function Dieta({ jugadorId }) {
  const [plan, setPlan] = useState('')
  const [actualizadoEn, setActualizadoEn] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/dieta`)
      .then(({ data }) => {
        setPlan(data.plan || '')
        setActualizadoEn(data.actualizado_en)
      })
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la dieta')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const guardar = async () => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await api.put(`/jugadores/${jugadorId}/dieta`, { plan })
      setMensaje('Dieta guardada correctamente')
      setEditando(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar la dieta'))
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="empty-state">
        <span className="spinner spinner-dark" />
      </div>
    )
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Dieta personalizada</h3>
        {!editando && (
          <button className="btn btn-primary btn-sm" onClick={() => setEditando(true)}>
            {plan ? 'Editar' : '+ Crear dieta'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      {actualizadoEn && !editando && (
        <p className="texto-muted" style={{ marginTop: -6 }}>
          Última actualización: {formatFecha(actualizadoEn)}
        </p>
      )}

      {editando ? (
        <>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Plan alimenticio</label>
            <textarea rows={16} value={plan} onChange={(e) => setPlan(e.target.value)} />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" onClick={guardar} disabled={guardando}>
              {guardando ? <span className="spinner" /> : 'Guardar'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditando(false)} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </>
      ) : plan ? (
        <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{plan}</p>
      ) : (
        <p className="texto-muted">Este jugador todavía no tiene una dieta personalizada cargada.</p>
      )}
    </div>
  )
}
