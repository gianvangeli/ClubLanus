import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import './AdminJugadorDetalle.css'

const CAMPOS_VACIOS = {
  nombre: '',
  apellido: '',
  edad: '',
  altura: '',
  nacionalidad_1: '',
  nacionalidad_2: '',
  posicion: '',
  categoria: '',
  division_nombre: '',
  contrato: '',
}

const AGENTE_VACIO = {
  agente_nombre: '',
  agente_apellido: '',
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
  partidos_jugados: '',
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
        <button className="btn btn-ghost btn-sm btn-danger" onClick={eliminarJugador}>
          Eliminar jugador
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="detalle-grid">
        <InfoJugador jugador={jugador} onActualizado={cargarJugador} />
        <Caracteristicas jugador={jugador} onActualizado={cargarJugador} />
      </div>

      <div className="detalle-grid detalle-grid-secundaria">
        <VideosJugador jugadorId={id} />
        <CargasFisicas jugadorId={id} />
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
      edad: jugador.edad ?? '',
      altura: jugador.altura ?? '',
      nacionalidad_1: jugador.nacionalidad_1 || '',
      nacionalidad_2: jugador.nacionalidad_2 || '',
      posicion: jugador.posicion || '',
      categoria: jugador.categoria || '',
      division_nombre: jugador.division_nombre || '',
      contrato: jugador.contrato || '',
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    const edad = aNumero(form.edad)
    const altura = aNumero(form.altura)
    if (edad === undefined || altura === undefined) {
      setError('Edad y altura tienen que ser números (podés usar coma o punto)')
      return
    }

    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugador.id}`, {
        nombre: form.nombre,
        apellido: form.apellido,
        edad,
        altura,
        nacionalidad_1: form.nacionalidad_1,
        nacionalidad_2: form.nacionalidad_2,
        posicion: form.posicion,
        categoria: form.categoria,
        division_nombre: form.division_nombre,
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
          <Dato label="Edad" valor={jugador.edad ? `${jugador.edad} años` : null} />
          <Dato label="Altura" valor={jugador.altura ? `${jugador.altura} m` : null} />
          <Dato
            label="Nacionalidad"
            valor={[jugador.nacionalidad_1, jugador.nacionalidad_2].filter(Boolean).join('/') || null}
          />
          <Dato label="Posición" valor={jugador.posicion} />
          <Dato label="Categoría" valor={jugador.categoria} />
          <Dato label="División" valor={jugador.division_nombre} />
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
            <label>Edad</label>
            <input type="text" inputMode="numeric" value={form.edad} onChange={onChange('edad')} />
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
          <div className="field">
            <label>Posición</label>
            <input value={form.posicion} onChange={onChange('posicion')} placeholder="Ej: Delantero" />
          </div>
          <div className="field">
            <label>Categoría</label>
            <input value={form.categoria} onChange={onChange('categoria')} placeholder="Ej: Primera" />
          </div>
          <div className="field">
            <label>División</label>
            <input value={form.division_nombre} onChange={onChange('division_nombre')} />
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

      <ComposicionCorporal jugador={jugador} onActualizado={onActualizado} />

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

  return (
    <div>
      <div className="seccion-header">
        <h3>Cuenta de acceso</h3>
      </div>

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
        <dl className="info-lista">
          <Dato label="Mail" valor={jugador.usuario_email} />
          <Dato label="Estado" valor="Vinculada" />
        </dl>
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

  const tieneDatos = jugador.agente_nombre || jugador.agente_apellido || jugador.agente_mail || jugador.agente_telefono

  const empezarEdicion = () => {
    setForm({
      agente_nombre: jugador.agente_nombre || '',
      agente_apellido: jugador.agente_apellido || '',
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
            <Dato label="Nombre" valor={jugador.agente_nombre} />
            <Dato label="Apellido" valor={jugador.agente_apellido} />
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
            <label>Nombre</label>
            <input value={form.agente_nombre} onChange={onChange('agente_nombre')} />
          </div>
          <div className="field">
            <label>Apellido</label>
            <input value={form.agente_apellido} onChange={onChange('agente_apellido')} />
          </div>
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
      partidos_jugados: jugador.partidos_jugados ?? '',
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

    const partidos = aNumero(form.partidos_jugados)
    if (partidos === undefined) {
      setError('Partidos jugados tiene que ser un número')
      return
    }

    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugador.id}/caracteristicas`, {
        pie: form.pie,
        posiciones_cancha: form.posiciones_cancha,
        partidos_jugados: partidos,
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
            <Dato label="Partidos jugados" valor={jugador.partidos_jugados} />
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
            <div className="field">
              <label>Partidos jugados</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 12"
                value={form.partidos_jugados}
                onChange={onChange('partidos_jugados')}
              />
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

function ComposicionCorporal({ jugador, onActualizado }) {
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ fecha: '', peso: '', grasa_corporal_pct: '', observaciones: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargarHistorial = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugador.id}/composicion`)
      .then(({ data }) => setHistorial(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargarHistorial, [jugador.id])

  const abrirForm = () => {
    setForm({ fecha: new Date().toISOString().slice(0, 10), peso: '', grasa_corporal_pct: '', observaciones: '' })
    setError('')
    setMostrarForm(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    const peso = aNumero(form.peso)
    const grasa = aNumero(form.grasa_corporal_pct)
    if (!peso) {
      setError('El peso es obligatorio y tiene que ser un número')
      return
    }
    if (grasa === undefined) {
      setError('El % de grasa corporal tiene que ser un número (podés usar coma o punto)')
      return
    }

    setEnviando(true)
    try {
      await api.post(`/jugadores/${jugador.id}/composicion`, {
        fecha: form.fecha,
        peso,
        grasa_corporal_pct: grasa,
        observaciones: form.observaciones,
      })
      setMostrarForm(false)
      cargarHistorial()
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar la medición'))
    } finally {
      setEnviando(false)
    }
  }

  const ultima = historial[0]

  return (
    <div className="composicion">
      <div className="composicion-actual">
        <div>
          <span className="composicion-label">Peso</span>
          <div className="composicion-valor">
            {jugador.peso ? `${jugador.peso} kg` : 'Sin datos'}
            {ultima?.grasa_corporal_pct != null && (
              <span className="composicion-grasa"> · {ultima.grasa_corporal_pct}% grasa</span>
            )}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirForm}>
          + Cargar medición
        </button>
      </div>

      {mostrarForm && (
        <form className="form-composicion" onSubmit={guardar}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-composicion-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
            </div>
            <div className="field">
              <label>Peso (kg)</label>
              <input type="text" inputMode="decimal" placeholder="Ej: 75,5" value={form.peso} onChange={onChange('peso')} required />
            </div>
            <div className="field">
              <label>% Grasa corporal</label>
              <input type="text" inputMode="decimal" placeholder="Ej: 12,5" value={form.grasa_corporal_pct} onChange={onChange('grasa_corporal_pct')} />
            </div>
          </div>
          <div className="field">
            <label>Observaciones</label>
            <input value={form.observaciones} onChange={onChange('observaciones')} />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar medición'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!cargando && historial.length > 0 && (
        <table className="tabla tabla-compacta">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso</th>
              <th>% Grasa</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                <td>{h.peso} kg</td>
                <td>{h.grasa_corporal_pct != null ? `${h.grasa_corporal_pct}%` : '—'}</td>
                <td className="texto-muted">{h.observaciones || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const etiquetaCarga = (carga) => {
  const f = new Date(carga.fecha)
  const dia = `${String(f.getUTCDate()).padStart(2, '0')}/${String(f.getUTCMonth() + 1).padStart(2, '0')}`
  return `Cargas físicas día ${dia}` + (carga.titulo ? ` (${carga.titulo})` : '')
}

function CargasFisicas({ jugadorId }) {
  const [cargas, setCargas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fecha, setFecha] = useState('')
  const [titulo, setTitulo] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/cargas-fisicas`)
      .then(({ data }) => setCargas(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!archivo) {
      setError('Elegí un archivo PDF')
      return
    }

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', fecha || new Date().toISOString().slice(0, 10))
      if (titulo) datos.append('titulo', titulo)
      datos.append('archivo', archivo)
      await api.post(`/jugadores/${jugadorId}/cargas-fisicas`, datos)
      setFecha('')
      setTitulo('')
      setArchivo(null)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo subir el PDF'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (carga) => {
    if (!window.confirm(`¿Eliminar "${etiquetaCarga(carga)}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${jugadorId}/cargas-fisicas/${carga.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la carga física'))
    }
  }

  const token = localStorage.getItem('token')

  return (
    <div className="card seccion cargas-fisicas-card">
      <h3>Cargas Físicas</h3>

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && cargas.length === 0 && (
        <p className="texto-muted">Todavía no hay cargas físicas subidas para este jugador.</p>
      )}

      {!cargando && cargas.length > 0 && (
        <div className="cf-lista">
          {cargas.map((c) => (
            <div className="cf-item" key={c.id}>
              <div className="cf-item-info">
                <strong>{etiquetaCarga(c)}</strong>
                <span className="texto-muted">
                  {new Date(c.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="cf-item-acciones">
                <a
                  className="btn btn-ghost btn-sm"
                  href={`${API_BASE}/api/jugadores/${jugadorId}/cargas-fisicas/${c.id}/archivo?token=${token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver PDF ↗
                </a>
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(c)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="divisor" />

      {error && <div className="alert alert-error">{error}</div>}

      <form className="form-video" onSubmit={onSubmit}>
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="field">
          <label>Aclaración (opcional)</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: partido, doble turno, recuperación"
          />
        </div>
        <div className="field">
          <label>Archivo PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files[0] || null)} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Subir carga física'}
        </button>
      </form>
    </div>
  )
}

function VideosJugador({ jugadorId }) {
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modo, setModo] = useState('archivo')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [urlVideo, setUrlVideo] = useState('')
  const [archivos, setArchivos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/videos`)
      .then(({ data }) => setVideos(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      if (modo === 'archivo') {
        if (archivos.length === 0) {
          setError('Elegí uno o más archivos de video')
          setEnviando(false)
          return
        }
        const datos = new FormData()
        if (titulo) datos.append('titulo', titulo)
        datos.append('descripcion', descripcion)
        archivos.forEach((archivo) => datos.append('videos', archivo))
        await api.post(`/jugadores/${jugadorId}/videos`, datos)
      } else {
        if (!urlVideo.trim()) {
          setError('Pegá al menos un link de video')
          setEnviando(false)
          return
        }
        await api.post(`/jugadores/${jugadorId}/videos`, {
          titulo: titulo || undefined,
          descripcion,
          url_video: urlVideo,
        })
      }
      setTitulo('')
      setDescripcion('')
      setUrlVideo('')
      setArchivos([])
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo agregar el video'))
    } finally {
      setEnviando(false)
    }
  }

  const token = localStorage.getItem('token')

  return (
    <div className="card seccion">
      <h3>Videos</h3>

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && videos.length === 0 && (
        <p className="texto-muted">Todavía no hay videos cargados para este jugador.</p>
      )}

      <div className="video-jugador-lista">
        {videos.map((v) => (
          <div className="video-jugador-item" key={v.id}>
            <div className="video-jugador-item-header">
              <strong>{v.titulo}</strong>
              <span className="badge badge-warning">{v.tipo === 'archivo' ? 'Archivo' : 'Link'}</span>
            </div>
            {v.descripcion && <p className="texto-muted">{v.descripcion}</p>}
            {v.tipo === 'archivo' ? (
              <video className="video-player" controls preload="metadata" src={`${API_BASE}/api/biblioteca/videos/${v.id}/archivo?token=${token}`} />
            ) : extraerIdYouTube(v.url_video) ? (
              <YouTubePlayer videoId={extraerIdYouTube(v.url_video)} />
            ) : (
              <a className="btn btn-ghost btn-sm" href={v.url_video} target="_blank" rel="noreferrer">
                Ver video externo ↗
              </a>
            )}
          </div>
        ))}
      </div>

      <hr className="divisor" />

      <div className="modo-toggle">
        <button
          type="button"
          className={`btn btn-sm ${modo === 'archivo' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setModo('archivo')}
        >
          Subir archivo
        </button>
        <button
          type="button"
          className={`btn btn-sm ${modo === 'link' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setModo('link')}
        >
          Link externo
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="form-video" onSubmit={onSubmit}>
        <div className="field">
          <label>Título {modo === 'archivo' ? '(opcional si subís varios)' : '(opcional)'}</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={modo === 'archivo' ? 'Se usa el nombre del archivo si lo dejás vacío' : 'Se usa el link si lo dejás vacío'}
          />
        </div>
        <div className="field">
          <label>Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        {modo === 'archivo' ? (
          <div className="field" key="archivo">
            <label>Archivos de video (cualquier formato, podés elegir varios)</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => setArchivos(Array.from(e.target.files))}
            />
            {archivos.length > 0 && (
              <span className="texto-muted">{archivos.length} archivo(s) seleccionado(s)</span>
            )}
          </div>
        ) : (
          <div className="field" key="link">
            <label>URLs del video (una por línea si son varios)</label>
            <textarea
              rows={3}
              value={urlVideo}
              onChange={(e) => setUrlVideo(e.target.value)}
              placeholder={'https://...\nhttps://...'}
            />
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? <span className="spinner" /> : 'Agregar video'}
        </button>
      </form>
    </div>
  )
}
