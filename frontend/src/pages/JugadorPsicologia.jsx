import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'
import './Psicologia.css'

export default function JugadorPsicologia() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)

  const cargarJugador = () => {
    api.get(`/jugadores/${id}`).then(({ data }) => setJugador(data))
  }

  useEffect(cargarJugador, [id])

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  return (
    <div className="page">
      <Link to={`/admin/jugadores/${id}`} className="btn btn-ghost btn-sm">
        ← Volver a la ficha
      </Link>

      <div className="seccion-especializada-header">
        <h1>Psicología del jugador{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="psicologia" />
      </div>

      <div className="detalle-grid">
        <PerfilPsicosocial jugadorId={id} />
        {jugador && <CuentaPsicologo jugador={jugador} onActualizado={cargarJugador} />}
      </div>
    </div>
  )
}

function PerfilPsicosocial({ jugadorId }) {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [contenido, setContenido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/perfil-psicosocial`)
      .then(({ data }) => setPerfil(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const empezarEdicion = () => {
    setContenido(perfil?.contenido || '')
    setError('')
    setEditando(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugadorId}/perfil-psicosocial`, { contenido })
      setEditando(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el perfil psicosocial'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Perfil psicosocial</h3>
        {!editando && !cargando && (
          <button className="btn btn-ghost btn-sm" onClick={empezarEdicion}>
            {perfil?.contenido ? 'Editar' : '+ Completar'}
          </button>
        )}
      </div>

      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Informe único y permanente: describe al jugador desde lo psicológico y social. Se
        actualiza siempre en el mismo lugar, no genera historial.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando ? (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      ) : !editando ? (
        perfil?.contenido ? (
          <p className="perfil-psicosocial-texto">{perfil.contenido}</p>
        ) : (
          <p className="texto-muted">Todavía no se cargó el perfil psicosocial de este jugador.</p>
        )
      ) : (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="field">
            <label>Contenido</label>
            <textarea rows={8} value={contenido} onChange={(e) => setContenido(e.target.value)} />
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

function CuentaPsicologo({ jugador, onActualizado }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [creada, setCreada] = useState(null)

  const crear = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const { data } = await api.post(`/jugadores/${jugador.id}/psicologo`, { nombre, email })
      setCreada(data)
      setNombre('')
      setEmail('')
      onActualizado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo crear la cuenta'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion">
      <h3>Psicólogo del jugador</h3>
      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Los informes psicológicos son exclusivos del psicólogo asignado: ni el cuerpo técnico
        ni la dirigencia pueden verlos.
      </p>

      {creada ? (
        <div className="alert alert-success">
          <p>Cuenta creada. Compartile estos datos únicamente al psicólogo (no se van a volver a mostrar):</p>
          <p>
            <strong>Mail:</strong> {creada.email}
            <br />
            <strong>Contraseña:</strong> {creada.password}
          </p>
        </div>
      ) : jugador.psicologo_id ? (
        <dl className="info-lista">
          <div className="info-dato">
            <dt>Mail</dt>
            <dd>{jugador.psicologo_email}</dd>
          </div>
          <div className="info-dato">
            <dt>Estado</dt>
            <dd>Vinculada</dd>
          </div>
        </dl>
      ) : (
        <form className="form-edicion" onSubmit={crear}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label>Nombre del psicólogo</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="field">
            <label>Mail del psicólogo</label>
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
