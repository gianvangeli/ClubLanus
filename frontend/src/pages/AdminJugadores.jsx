import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { calcularEdad } from '../utils/fecha'
import { colorSemaforo } from '../utils/semaforo'
import './AdminJugadores.css'

const VACIO = {
  nombre: '', apellido: '', fecha_nacimiento: '',
  nacionalidad_1: '', nacionalidad_2: '', nacionalidad_2_tramite: '',
  categoria: '', contrato: '', contrato_hasta_mes: '', contrato_hasta_anio: '',
}

const ESTADISTICAS_VACIAS = { minutos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0 }

const COLORES_AVATAR = ['avatar-granate', 'avatar-oro', 'avatar-gris', 'avatar-granate-claro']

const iniciales = (jugador) =>
  `${jugador.nombre?.[0] || ''}${jugador.apellido?.[0] || ''}`.toUpperCase()

export default function AdminJugadores() {
  const [jugadores, setJugadores] = useState([])
  const [estadisticas, setEstadisticas] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(VACIO)
  const [mostrarInfoJugador, setMostrarInfoJugador] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    Promise.all([api.get('/jugadores'), api.get('/jugadores/estadisticas')])
      .then(([resJugadores, resEstadisticas]) => {
        setJugadores(resJugadores.data)
        setEstadisticas(resEstadisticas.data)
      })
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

    setEnviando(true)
    try {
      await api.post('/jugadores', {
        nombre: form.nombre,
        apellido: form.apellido,
        fecha_nacimiento: form.fecha_nacimiento || null,
        nacionalidad_1: form.nacionalidad_1 || null,
        nacionalidad_2: form.nacionalidad_2 || null,
        nacionalidad_2_tramite: form.nacionalidad_2_tramite || null,
        categoria: form.categoria || null,
        contrato: form.contrato || null,
        contrato_hasta_mes: form.contrato_hasta_mes || null,
        contrato_hasta_anio: form.contrato_hasta_anio || null,
      })
      setMensaje('Jugador registrado correctamente')
      setForm(VACIO)
      setMostrarInfoJugador(false)
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
    <div className="jugadores-tema">
      <div className="page jugadores-page">
        <div className="page-header">
          <div>
            <h1>Jugadores</h1>
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
              <label>Fecha de nacimiento</label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={onChange('fecha_nacimiento')}
              />
              {calcularEdad(form.fecha_nacimiento) !== null && (
                <span className="jg-edad-preview">{calcularEdad(form.fecha_nacimiento)} años</span>
              )}
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm jg-info-toggle"
              onClick={() => setMostrarInfoJugador((v) => !v)}
            >
              {mostrarInfoJugador ? '− Ocultar info del jugador' : '+ Agregar info del jugador (opcional)'}
            </button>

            {mostrarInfoJugador && (
              <div className="jg-info-jugador-form">
                <div className="field">
                  <label>Categoría</label>
                  <input value={form.categoria} onChange={onChange('categoria')} />
                </div>
                <div className="field">
                  <label>Nacionalidad</label>
                  <input value={form.nacionalidad_1} onChange={onChange('nacionalidad_1')} />
                </div>
                <div className="field">
                  <label>Segunda nacionalidad</label>
                  <input value={form.nacionalidad_2} onChange={onChange('nacionalidad_2')} />
                </div>
                {form.nacionalidad_2 && (
                  <div className="field">
                    <label>Trámite de la segunda nacionalidad</label>
                    <select value={form.nacionalidad_2_tramite} onChange={onChange('nacionalidad_2_tramite')}>
                      <option value="">Sin especificar</option>
                      <option value="sin_iniciar">Sin iniciar</option>
                      <option value="en_curso">En curso</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Contrato</label>
                  <select value={form.contrato} onChange={onChange('contrato')}>
                    <option value="">Sin especificar</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {form.contrato === 'si' && (
                  <div className="jg-form-row">
                    <div className="field">
                      <label>Vence en</label>
                      <select value={form.contrato_hasta_mes} onChange={onChange('contrato_hasta_mes')}>
                        <option value="">Mes</option>
                        <option value="julio">Julio</option>
                        <option value="diciembre">Diciembre</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Año</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form.contrato_hasta_anio}
                        onChange={onChange('contrato_hasta_anio')}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

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
                <div className="jg-fila-header">
                  <span className="jg-fila-header-nombre">Jugador</span>
                  <div className="jg-fila-stats">
                    <span>Edad</span>
                    <span>Min</span>
                    <span>Goles</span>
                    <span>Ast</span>
                    <span>TA</span>
                    <span>TR</span>
                    <span>Rating</span>
                  </div>
                </div>
                {jugadores.map((j, i) => {
                  const est = estadisticas[j.id] || ESTADISTICAS_VACIAS
                  return (
                    <div className="jg-fila" key={j.id}>
                      <Link className="jg-fila-link" to={`/admin/jugadores/${j.id}`}>
                        <AvatarJugador
                          jugador={j}
                          colorClase={COLORES_AVATAR[i % COLORES_AVATAR.length]}
                          onFotoActualizada={cargar}
                        />
                        <div className="jg-fila-info">
                          <strong>
                            {j.nombre} {j.apellido}
                          </strong>
                          <span>{j.posicion || j.categoria || 'Sin posición'}</span>
                        </div>
                        <div className="jg-fila-stats">
                          <span className="jg-stat-valor-chico">{j.edad ?? '—'}</span>
                          <span className="jg-stat-valor-chico">{est.minutos}</span>
                          <span className="jg-stat-valor-chico">{est.goles}</span>
                          <span className="jg-stat-valor-chico">{est.asistencias}</span>
                          <span className="jg-stat-chip jg-stat-chip-amarillo">{est.amarillas}</span>
                          <span className="jg-stat-chip jg-stat-chip-rojo">{est.rojas}</span>
                          <span className="jg-stat-valor-chico jg-stat-pendiente" title="Todavía sin definir">—</span>
                        </div>
                        <div className="jg-fila-chips">
                          {j.semaforo_riesgo_ia && (
                            <span className="jg-chip" title={j.motivo_riesgo_ia || ''}>
                              <span className="jg-chip-dot" style={{ background: colorSemaforo(j.semaforo_riesgo_ia) }} />
                              Riesgo IA
                            </span>
                          )}
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
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AvatarJugador({ jugador, colorClase, onFotoActualizada }) {
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const token = localStorage.getItem('token')

  const elegirArchivo = (e) => {
    e.preventDefault()
    e.stopPropagation()
    inputRef.current?.click()
  }

  const onArchivoElegido = async (e) => {
    const archivo = e.target.files[0]
    e.target.value = ''
    if (!archivo) return

    const formData = new FormData()
    formData.append('foto', archivo)

    setSubiendo(true)
    try {
      await api.post(`/jugadores/${jugador.id}/foto`, formData)
      onFotoActualizada()
    } catch {
      // El error de subida no bloquea el listado; el jugador simplemente sigue con iniciales.
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="jg-avatar-wrap">
      {jugador.tiene_foto ? (
        <img
          className="jg-avatar jg-avatar-foto"
          src={`${API_BASE}/api/jugadores/${jugador.id}/foto?token=${token}`}
          alt={`${jugador.nombre} ${jugador.apellido}`}
        />
      ) : (
        <div className={`jg-avatar ${colorClase}`}>{iniciales(jugador)}</div>
      )}
      <button
        type="button"
        className="jg-avatar-subir"
        title="Cambiar foto"
        onClick={elegirArchivo}
        disabled={subiendo}
      >
        {subiendo ? <span className="spinner" /> : '📷'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onClick={(e) => e.stopPropagation()}
        onChange={onArchivoElegido}
      />
    </div>
  )
}
