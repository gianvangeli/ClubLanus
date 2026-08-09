import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import { aInputDate, calcularEdad, formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'

const etiquetaTramite = (valor) => (valor === 'en_curso' ? 'Trámite en curso' : valor === 'finalizado' ? 'Trámite finalizado' : null)

const CAMPOS_VACIOS = {
  nombre: '',
  apellido: '',
  fecha_nacimiento: '',
  altura: '',
  nacionalidad_1: '',
  nacionalidad_2: '',
  nacionalidad_2_tramite: '',
  categoria: '',
  contrato: '',
}

const AGENTE_VACIO = {
  agente_tipo: 'persona',
  agente_nombre: '',
  agente_apellido: '',
  agente_empresa: '',
  agente_mail: '',
  agente_telefono: '',
}

const CONTACTO_EMERGENCIA_VACIO = {
  contacto_emergencia_nombre: '',
  contacto_emergencia_apellido: '',
  contacto_emergencia_relacion: '',
  contacto_emergencia_telefono: '',
}

const CARACTERISTICAS_VACIO = {
  pie: '',
  posiciones_cancha: [],
}

// Posiciones fijas para el gráfico de cancha (coordenadas en un viewBox de 100x150)
const POSICIONES_CANCHA = [
  { valor: 'Arquero', x: 50, y: 138 },
  { valor: 'Defensor', x: 50, y: 112 },
  { valor: 'Lateral Derecho', x: 80, y: 104 },
  { valor: 'Lateral Izquierdo', x: 20, y: 104 },
  { valor: 'Volante Defensivo', x: 50, y: 88 },
  { valor: 'Volante', x: 50, y: 68 },
  { valor: 'Volante Ofensivo', x: 50, y: 48 },
  { valor: 'Extremo Derecho', x: 80, y: 32 },
  { valor: 'Extremo Izquierdo', x: 20, y: 32 },
  { valor: 'Delantero', x: 50, y: 16 },
]

export default function AdminJugadorDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
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

  const eliminarJugador = async () => {
    if (!window.confirm(`¿Eliminar a ${jugador.nombre} ${jugador.apellido}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${id}`)
      navigate('/admin/jugadores')
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el jugador'))
    }
  }

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

  const iniciales = `${jugador.nombre?.[0] || ''}${jugador.apellido?.[0] || ''}`.toUpperCase()

  return (
    <div className="page">
      <Link to="/admin/jugadores" className="btn btn-ghost btn-sm">
        ← Volver al plantel
      </Link>

      <div className="detalle-header">
        <div className="detalle-header-avatar">{iniciales}</div>
        <div className="detalle-header-info">
          <h1>
            {jugador.nombre} {jugador.apellido}
          </h1>
          <div className="detalle-header-badges">
            {jugador.posicion && <span className="chip-outline">{jugador.posicion}</span>}
            {jugador.categoria && <span className="chip-outline">{jugador.categoria}</span>}
            {jugador.division_nombre && <span className="chip-outline">{jugador.division_nombre}</span>}
            {jugador.contrato && (
              <span className={`chip-outline ${jugador.contrato === 'si' ? 'chip-outline-ok' : ''}`}>
                Contrato {jugador.contrato === 'si' ? 'vigente' : 'vencido'}
              </span>
            )}
          </div>
        </div>
        <div className="detalle-header-acciones">
          <MenuSeccionesJugador
            jugadorId={id}
            jugadorNombre={`${jugador.nombre} ${jugador.apellido}`}
            activa="presentacion"
          />
          <button className="btn btn-ghost btn-sm btn-danger" onClick={eliminarJugador}>
            Eliminar jugador
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="detalle-grid">
        <InfoJugador jugador={jugador} onActualizado={cargarJugador} />
        <Caracteristicas jugador={jugador} onActualizado={cargarJugador} />
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
      fecha_nacimiento: aInputDate(jugador.fecha_nacimiento),
      altura: jugador.altura ?? '',
      nacionalidad_1: jugador.nacionalidad_1 || '',
      nacionalidad_2: jugador.nacionalidad_2 || '',
      nacionalidad_2_tramite: jugador.nacionalidad_2_tramite || '',
      categoria: jugador.categoria || '',
      contrato: jugador.contrato || '',
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    const altura = aNumero(form.altura)
    if (altura === undefined) {
      setError('Altura tiene que ser un número (podés usar coma o punto)')
      return
    }

    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugador.id}`, {
        nombre: form.nombre,
        apellido: form.apellido,
        fecha_nacimiento: form.fecha_nacimiento || null,
        altura,
        nacionalidad_1: form.nacionalidad_1,
        nacionalidad_2: form.nacionalidad_2,
        nacionalidad_2_tramite: form.nacionalidad_2_tramite,
        categoria: form.categoria,
        contrato: form.contrato,
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
          <Dato
            label="Fecha de nacimiento"
            valor={jugador.fecha_nacimiento ? `${formatFecha(jugador.fecha_nacimiento)} (${jugador.edad} años)` : null}
          />
          <Dato label="Altura" valor={jugador.altura ? `${jugador.altura} m` : null} />
          <Dato
            label="Nacionalidad"
            valor={[jugador.nacionalidad_1, jugador.nacionalidad_2].filter(Boolean).join('/') || null}
          />
          {jugador.nacionalidad_2 && (
            <Dato
              label="Trámite segunda nacionalidad"
              valor={
                jugador.nacionalidad_2_tramite
                  ? `${jugador.nacionalidad_2} — ${etiquetaTramite(jugador.nacionalidad_2_tramite)}`
                  : null
              }
            />
          )}
          <Dato label="Categoría" valor={jugador.categoria} />
          <Dato label="Contrato" valor={jugador.contrato === 'si' ? 'Sí' : jugador.contrato === 'no' ? 'No' : null} />
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
            <label>Fecha de nacimiento</label>
            <input type="date" value={form.fecha_nacimiento} onChange={onChange('fecha_nacimiento')} />
            {calcularEdad(form.fecha_nacimiento) !== null && (
              <span className="texto-muted">{calcularEdad(form.fecha_nacimiento)} años</span>
            )}
          </div>
          <div className="field">
            <label>Altura (m)</label>
            <input type="text" inputMode="decimal" value={form.altura} onChange={onChange('altura')} />
          </div>
          <div className="field">
            <label>Nacionalidad</label>
            <input value={form.nacionalidad_1} onChange={onChange('nacionalidad_1')} placeholder="Ej: Argentina" />
          </div>
          <div className="field">
            <label>Segunda nacionalidad (opcional)</label>
            <input value={form.nacionalidad_2} onChange={onChange('nacionalidad_2')} placeholder="Ej: Paraguay" />
          </div>
          {form.nacionalidad_2 && (
            <div className="field">
              <label>Trámite de {form.nacionalidad_2}</label>
              <select value={form.nacionalidad_2_tramite} onChange={onChange('nacionalidad_2_tramite')}>
                <option value="">Sin especificar</option>
                <option value="en_curso">En curso</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
          )}
          <div className="field">
            <label>Categoría</label>
            <input value={form.categoria} onChange={onChange('categoria')} placeholder="Ej: Primera" />
          </div>
          <div className="field">
            <label>Contrato</label>
            <select value={form.contrato} onChange={onChange('contrato')}>
              <option value="">Sin definir</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
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

      <CuentaAcceso jugador={jugador} onActualizado={onActualizado} />

      <hr className="divisor" />

      <Agente jugador={jugador} onActualizado={onActualizado} />

      <hr className="divisor" />

      <ContactoEmergencia jugador={jugador} onActualizado={onActualizado} />
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

function CuentaAcceso({ jugador, onActualizado }) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [creada, setCreada] = useState(null)
  const [restableciendo, setRestableciendo] = useState(false)
  const [passwordNueva, setPasswordNueva] = useState(null)

  const crear = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const { data } = await api.post(`/jugadores/${jugador.id}/cuenta`, { email })
      setCreada(data)
      setEmail('')
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo crear la cuenta'))
    } finally {
      setEnviando(false)
    }
  }

  const restablecer = async () => {
    if (!window.confirm('¿Restablecer la contraseña de este jugador? La contraseña actual dejará de funcionar.')) {
      return
    }
    setError('')
    setRestableciendo(true)
    try {
      const { data } = await api.put(`/jugadores/${jugador.id}/cuenta/restablecer-password`)
      setPasswordNueva(data.password)
    } catch (err) {
      setError(extraerError(err, 'No se pudo restablecer la contraseña'))
    } finally {
      setRestableciendo(false)
    }
  }

  return (
    <div>
      <div className="seccion-header">
        <h3>Cuenta de acceso</h3>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {creada ? (
        <div className="alert alert-success">
          <p>Cuenta creada. Compartile estos datos al jugador (no se van a volver a mostrar):</p>
          <p>
            <strong>Mail:</strong> {creada.email}
            <br />
            <strong>Contraseña:</strong> {creada.password}
          </p>
        </div>
      ) : jugador.usuario_id ? (
        <>
          <dl className="info-lista">
            <Dato label="Mail" valor={jugador.usuario_email} />
            <Dato label="Estado" valor="Vinculada" />
          </dl>

          {passwordNueva ? (
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              <p>Contraseña restablecida. Compartísela al jugador (no se va a volver a mostrar):</p>
              <p>
                <strong>Contraseña nueva:</strong> {passwordNueva}
              </p>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 12 }}
              onClick={restablecer}
              disabled={restableciendo}
            >
              {restableciendo ? <span className="spinner" /> : 'Restablecer contraseña'}
            </button>
          )}
        </>
      ) : (
        <form className="form-edicion" onSubmit={crear}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label>Mail del jugador</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
            {enviando ? <span className="spinner" /> : 'Crear cuenta'}
          </button>
        </form>
      )}
    </div>
  )
}

function Agente({ jugador, onActualizado }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(AGENTE_VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const tieneDatos =
    jugador.agente_nombre || jugador.agente_apellido || jugador.agente_empresa || jugador.agente_mail || jugador.agente_telefono

  const empezarEdicion = () => {
    setForm({
      agente_tipo: jugador.agente_tipo || 'persona',
      agente_nombre: jugador.agente_nombre || '',
      agente_apellido: jugador.agente_apellido || '',
      agente_empresa: jugador.agente_empresa || '',
      agente_mail: jugador.agente_mail || '',
      agente_telefono: jugador.agente_telefono || '',
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugador.id}/agente`, form)
      setEditando(false)
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el agente'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <div className="seccion-header">
        <h3>Agente</h3>
        {!editando && (
          <button className="btn btn-ghost btn-sm" onClick={empezarEdicion}>
            {tieneDatos ? 'Editar' : '+ Agregar agente'}
          </button>
        )}
      </div>

      {!editando ? (
        tieneDatos ? (
          <dl className="info-lista">
            {jugador.agente_tipo === 'empresa' ? (
              <Dato label="Empresa" valor={jugador.agente_empresa} />
            ) : (
              <>
                <Dato label="Nombre" valor={jugador.agente_nombre} />
                <Dato label="Apellido" valor={jugador.agente_apellido} />
              </>
            )}
            <Dato label="Mail" valor={jugador.agente_mail} />
            <Dato label="Teléfono" valor={jugador.agente_telefono} />
          </dl>
        ) : (
          <p className="texto-muted">Todavía no se cargó el agente del jugador.</p>
        )
      ) : (
        <form className="form-edicion" onSubmit={guardar}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label>Tipo</label>
            <div className="modo-toggle">
              <button
                type="button"
                className={`btn btn-sm ${form.agente_tipo === 'persona' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setForm({ ...form, agente_tipo: 'persona' })}
              >
                Persona
              </button>
              <button
                type="button"
                className={`btn btn-sm ${form.agente_tipo === 'empresa' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setForm({ ...form, agente_tipo: 'empresa' })}
              >
                Empresa
              </button>
            </div>
          </div>
          {form.agente_tipo === 'empresa' ? (
            <div className="field">
              <label>Empresa</label>
              <input value={form.agente_empresa} onChange={onChange('agente_empresa')} placeholder="Razón social" />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Nombre</label>
                <input value={form.agente_nombre} onChange={onChange('agente_nombre')} />
              </div>
              <div className="field">
                <label>Apellido</label>
                <input value={form.agente_apellido} onChange={onChange('agente_apellido')} />
              </div>
            </>
          )}
          <div className="field">
            <label>Mail</label>
            <input type="email" value={form.agente_mail} onChange={onChange('agente_mail')} />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={form.agente_telefono} onChange={onChange('agente_telefono')} />
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
    </div>
  )
}

function ContactoEmergencia({ jugador, onActualizado }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(CONTACTO_EMERGENCIA_VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const tieneDatos =
    jugador.contacto_emergencia_nombre ||
    jugador.contacto_emergencia_apellido ||
    jugador.contacto_emergencia_relacion ||
    jugador.contacto_emergencia_telefono

  const empezarEdicion = () => {
    setForm({
      contacto_emergencia_nombre: jugador.contacto_emergencia_nombre || '',
      contacto_emergencia_apellido: jugador.contacto_emergencia_apellido || '',
      contacto_emergencia_relacion: jugador.contacto_emergencia_relacion || '',
      contacto_emergencia_telefono: jugador.contacto_emergencia_telefono || '',
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugador.id}/contacto-emergencia`, form)
      setEditando(false)
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el contacto de emergencia'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <div className="seccion-header">
        <h3>Contacto de emergencia</h3>
        {!editando && (
          <button className="btn btn-ghost btn-sm" onClick={empezarEdicion}>
            {tieneDatos ? 'Editar' : '+ Agregar contacto de emergencia'}
          </button>
        )}
      </div>

      {!editando ? (
        tieneDatos ? (
          <dl className="info-lista">
            <Dato label="Nombre" valor={jugador.contacto_emergencia_nombre} />
            <Dato label="Apellido" valor={jugador.contacto_emergencia_apellido} />
            <Dato label="Relación" valor={jugador.contacto_emergencia_relacion} />
            <Dato label="Teléfono" valor={jugador.contacto_emergencia_telefono} />
          </dl>
        ) : (
          <p className="texto-muted">Todavía no se cargó un contacto de emergencia.</p>
        )
      ) : (
        <form className="form-edicion" onSubmit={guardar}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label>Nombre</label>
            <input value={form.contacto_emergencia_nombre} onChange={onChange('contacto_emergencia_nombre')} />
          </div>
          <div className="field">
            <label>Apellido</label>
            <input value={form.contacto_emergencia_apellido} onChange={onChange('contacto_emergencia_apellido')} />
          </div>
          <div className="field">
            <label>Relación</label>
            <input
              value={form.contacto_emergencia_relacion}
              onChange={onChange('contacto_emergencia_relacion')}
              placeholder="Ej: Padre, madre, tutor"
            />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={form.contacto_emergencia_telefono} onChange={onChange('contacto_emergencia_telefono')} />
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
    </div>
  )
}

function Cancha({ posiciones, editable, onToggle }) {
  const seleccionadas = posiciones || []

  return (
    <svg viewBox="0 0 100 150" className="cancha-svg">
      <rect x="2" y="2" width="96" height="146" className="cancha-linea" />
      <line x1="2" y1="75" x2="98" y2="75" className="cancha-linea" />
      <circle cx="50" cy="75" r="12" className="cancha-linea" />
      <circle cx="50" cy="75" r="0.8" className="cancha-punto" />
      <rect x="25" y="2" width="50" height="22" className="cancha-linea" />
      <rect x="38" y="2" width="24" height="8" className="cancha-linea" />
      <circle cx="50" cy="18" r="0.8" className="cancha-punto" />
      <rect x="25" y="126" width="50" height="22" className="cancha-linea" />
      <rect x="38" y="140" width="24" height="8" className="cancha-linea" />
      <circle cx="50" cy="132" r="0.8" className="cancha-punto" />
      {POSICIONES_CANCHA.map((p) => {
        const activo = seleccionadas.includes(p.valor)
        if (!activo && !editable) return null
        return (
          <circle
            key={p.valor}
            cx={p.x}
            cy={p.y}
            r={activo ? 5 : 3}
            className={`cancha-marcador ${activo ? 'cancha-marcador-activo' : 'cancha-marcador-inactivo'} ${editable ? 'cancha-marcador-clickable' : ''}`}
            onClick={editable ? () => onToggle(p.valor) : undefined}
          >
            <title>{p.valor}</title>
          </circle>
        )
      })}
    </svg>
  )
}

function Caracteristicas({ jugador, onActualizado }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(CARACTERISTICAS_VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const empezarEdicion = () => {
    setForm({
      pie: jugador.pie || '',
      posiciones_cancha: jugador.posiciones_cancha || [],
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const toggleSector = (valor) => {
    setForm((prev) => ({
      ...prev,
      posiciones_cancha: prev.posiciones_cancha.includes(valor)
        ? prev.posiciones_cancha.filter((v) => v !== valor)
        : [...prev.posiciones_cancha, valor],
    }))
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugador.id}/caracteristicas`, {
        pie: form.pie,
        posiciones_cancha: form.posiciones_cancha,
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
    <div className="card seccion caracteristicas-card">
      <div className="seccion-header">
        <h3>Características</h3>
        {!editando && (
          <button className="btn btn-ghost btn-sm" onClick={empezarEdicion}>
            Editar
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="caracteristicas-layout">
        <div>
          <Cancha
            posiciones={editando ? form.posiciones_cancha : jugador.posiciones_cancha}
            editable={editando}
            onToggle={toggleSector}
          />
          {editando && <p className="texto-muted cancha-hint">Tocá la cancha para marcar los sectores que ocupa</p>}
        </div>

        {!editando ? (
          <dl className="info-lista">
            <Dato
              label="Pie"
              valor={jugador.pie === 'derecho' ? 'Derecho' : jugador.pie === 'izquierdo' ? 'Izquierdo' : null}
            />
            <Dato
              label="Sectores de cancha"
              valor={jugador.posiciones_cancha?.length > 0 ? jugador.posiciones_cancha.join(', ') : null}
            />
          </dl>
        ) : (
          <form className="form-edicion" onSubmit={guardar}>
            <div className="field">
              <label>Pie</label>
              <select value={form.pie} onChange={onChange('pie')}>
                <option value="">Sin definir</option>
                <option value="derecho">Derecho</option>
                <option value="izquierdo">Izquierdo</option>
              </select>
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
      </div>
    </div>
  )
}

