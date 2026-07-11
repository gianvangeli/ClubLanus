import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import './AdminJugadores.css'

const VACIO = { nombre: '', apellido: '', edad: '', altura: '' }

const COLORES_AVATAR = ['avatar-granate', 'avatar-oro', 'avatar-gris', 'avatar-granate-claro']

const iniciales = (jugador) =>
  `${jugador.nombre?.[0] || ''}${jugador.apellido?.[0] || ''}`.toUpperCase()

export default function AdminJugadores() {
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(VACIO)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get('/jugadores')
      .then(({ data }) => setJugadores(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el listado')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const eliminar = async (jugador) => {
    if (!window.confirm(`¿Eliminar a ${jugador.nombre} ${jugador.apellido}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${jugador.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el jugador'))
    }
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const edad = aNumero(form.edad)
    const altura = aNumero(form.altura)

    if (edad === undefined || altura === undefined) {
      setError('Edad y altura tienen que ser números (podés usar coma o punto)')
      return
    }

    setEnviando(true)
    try {
      await api.post('/jugadores', {
        nombre: form.nombre,
        apellido: form.apellido,
        edad,
        altura,
      })
      setMensaje('Jugador registrado correctamente')
      setForm(VACIO)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar el jugador'))
    } finally {
      setEnviando(false)
    }
  }

  const stats = useMemo(() => {
    const vinculados = jugadores.filter((j) => j.usuario_id).length
    return {
      total: jugadores.length,
      vinculados,
      sinVincular: jugadores.length - vinculados,
    }
  }, [jugadores])

  return (
    <div className="jugadores-dark">
      <div className="page jugadores-page">
        <div className="page-header">
          <div>
            <h1>Jugadores</h1>
            <p>Fichas físicas del plantel — solo cuerpo técnico</p>
          </div>
        </div>

        <div className="jg-stats">
          <div className="jg-stat-tile jg-stat-granate">
            <span className="jg-stat-label">Plantel</span>
            <span className="jg-stat-valor">{stats.total}</span>
          </div>
          <div className="jg-stat-tile jg-stat-oro">
            <span className="jg-stat-label">Vinculados</span>
            <span className="jg-stat-valor">{stats.vinculados}</span>
          </div>
          <div className="jg-stat-tile jg-stat-gris">
            <span className="jg-stat-label">Sin vincular</span>
            <span className="jg-stat-valor">{stats.sinVincular}</span>
          </div>
        </div>

        <div className="admin-jugadores-layout">
          <form className="jg-card jg-form-card" onSubmit={onSubmit}>
            <h3>Nueva ficha</h3>

            {error && <div className="alert alert-error">{error}</div>}
            {mensaje && <div className="alert alert-success">{mensaje}</div>}

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
              <input
                type="text"
                inputMode="numeric"
                placeholder="Años"
                value={form.edad}
                onChange={onChange('edad')}
              />
            </div>
            <div className="field">
              <label>Altura (m)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ej: 1,78"
                value={form.altura}
                onChange={onChange('altura')}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Registrar jugador'}
            </button>
          </form>

          <div className="jg-card jg-list-card">
            <div className="jg-list-header">
              <h3>Plantel</h3>
              <span className="jg-count-chip">{stats.total} jug.</span>
            </div>

            {cargando && (
              <div className="empty-state">
                <span className="spinner spinner-dark" />
              </div>
            )}
            {!cargando && jugadores.length === 0 && (
              <div className="empty-state">
                <p>Todavía no hay jugadores cargados.</p>
              </div>
            )}
            {!cargando && jugadores.length > 0 && (
              <div className="jg-lista">
                {jugadores.map((j, i) => (
                  <div className="jg-fila" key={j.id}>
                    <Link className="jg-fila-link" to={`/admin/jugadores/${j.id}`}>
                      <div className={`jg-avatar ${COLORES_AVATAR[i % COLORES_AVATAR.length]}`}>
                        {iniciales(j)}
                      </div>
                      <div className="jg-fila-info">
                        <strong>
                          {j.nombre} {j.apellido}
                        </strong>
                        <span>{j.posicion || j.categoria || 'Sin posición'}</span>
                      </div>
                      <div className="jg-fila-chips">
                        {j.edad && <span className="jg-chip">{j.edad} años</span>}
                        {j.altura && <span className="jg-chip">{j.altura} m</span>}
                        {j.peso && <span className="jg-chip">{j.peso} kg</span>}
                        {j.usuario_id ? (
                          <span className="jg-chip jg-chip-oro">Vinculado</span>
                        ) : (
                          <span className="jg-chip jg-chip-gris">Sin vincular</span>
                        )}
                      </div>
                    </Link>
                    <button
                      className="jg-eliminar"
                      title="Eliminar jugador"
                      onClick={() => eliminar(j)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
