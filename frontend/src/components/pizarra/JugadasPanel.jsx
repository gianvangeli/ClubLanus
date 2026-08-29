import { useEffect, useState } from 'react'
import api, { extraerError } from '../../api/client'
import { formatFechaHora } from '../../utils/fecha'
import './JugadasPanel.css'

const tableroTieneContenido = (modelo) =>
  modelo.escenas.length > 1 ||
  modelo.escenas.some(
    (e) => e.jugadores.length > 0 || e.flechas.length > 0 || e.figuras.length > 0 || e.textos.length > 0 || e.trazos.length > 0 || e.zonas.length > 0
  )

/**
 * Panel "Jugadas guardadas": biblioteca de tableros de la Pizarra Táctica
 * guardados con nombre propio (independiente del ejercicio actual), para
 * poder cargarlos en cualquier otra pizarra más adelante sin redibujar.
 * Combina alta (guardar el tablero actual) y listado/carga/borrado en un
 * solo panel, en vez de dos modales separados.
 */
export default function JugadasPanel({ modeloActual, onCargar, onCerrar }) {
  const [jugadas, setJugadas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarLista = () => {
    setCargando(true)
    api
      .get('/pizarra-jugadas')
      .then(({ data }) => setJugadas(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar las jugadas guardadas')))
      .finally(() => setCargando(false))
  }

  useEffect(cargarLista, [])

  const [formAbierto, setFormAbierto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  const guardarActual = async (e) => {
    e.preventDefault()
    if (!titulo.trim()) return
    setErrorGuardar('')
    setGuardando(true)
    try {
      await api.post('/pizarra-jugadas', { titulo: titulo.trim(), dibujo_json: JSON.stringify(modeloActual) })
      setTitulo('')
      setFormAbierto(false)
      cargarLista()
    } catch (err) {
      setErrorGuardar(extraerError(err, 'No se pudo guardar la jugada'))
    } finally {
      setGuardando(false)
    }
  }

  const [cargandoId, setCargandoId] = useState(null)
  const cargarEnPizarra = async (jugada) => {
    if (tableroTieneContenido(modeloActual) && !window.confirm(`¿Reemplazar el tablero actual por "${jugada.titulo}"? Se pierde lo que no hayas guardado.`)) {
      return
    }
    setCargandoId(jugada.id)
    setError('')
    try {
      const { data } = await api.get(`/pizarra-jugadas/${jugada.id}`)
      onCargar(data.dibujo_json)
      onCerrar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo cargar la jugada'))
    } finally {
      setCargandoId(null)
    }
  }

  const eliminarJugada = async (jugada) => {
    if (!window.confirm(`¿Eliminar la jugada "${jugada.titulo}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/pizarra-jugadas/${jugada.id}`)
      cargarLista()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la jugada'))
    }
  }

  return (
    <div className="jugadas-overlay" onClick={onCerrar}>
      <div className="jugadas-panel" onClick={(e) => e.stopPropagation()}>
        <div className="jugadas-header">
          <h3>Jugadas guardadas</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onCerrar}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!formAbierto ? (
          <button type="button" className="btn btn-primary btn-sm jugadas-boton-guardar" onClick={() => setFormAbierto(true)}>
            + Guardar tablero actual como jugada
          </button>
        ) : (
          <form className="jugadas-form-guardar" onSubmit={guardarActual}>
            {errorGuardar && <div className="alert alert-error">{errorGuardar}</div>}
            <input
              autoFocus
              placeholder="Nombre de la jugada"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={150}
            />
            <div className="jugadas-form-botones">
              <button type="submit" className="btn btn-primary btn-sm" disabled={guardando || !titulo.trim()}>
                {guardando ? <span className="spinner" /> : 'Guardar'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFormAbierto(false); setTitulo(''); setErrorGuardar('') }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="jugadas-lista">
          {cargando && (
            <div className="empty-state">
              <span className="spinner spinner-dark" />
            </div>
          )}

          {!cargando && jugadas.length === 0 && (
            <p className="texto-muted">Todavía no guardaste ninguna jugada.</p>
          )}

          {jugadas.map((j) => (
            <div className="jugadas-item" key={j.id}>
              <div className="jugadas-item-info">
                <strong>{j.titulo}</strong>
                <span className="texto-muted">{formatFechaHora(j.creado_en)}</span>
              </div>
              <div className="jugadas-item-acciones">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => cargarEnPizarra(j)} disabled={cargandoId === j.id}>
                  {cargandoId === j.id ? <span className="spinner" /> : 'Cargar'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminarJugada(j)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
