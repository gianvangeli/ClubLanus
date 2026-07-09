import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import './AdminJugadores.css'

const VACIO = { nombre: '', apellido: '', edad: '', altura: '' }

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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Jugadores</h1>
          <p>Fichas físicas del plantel — solo cuerpo técnico</p>
        </div>
      </div>

      <div className="admin-jugadores-layout">
        <form className="card form-card" onSubmit={onSubmit}>
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

        <div className="card table-card">
          <h3>Plantel</h3>
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
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>Peso</th>
                  <th>Altura</th>
                  <th>Cuenta vinculada</th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link className="tabla-link" to={`/admin/jugadores/${j.id}`}>
                        {j.nombre} {j.apellido}
                      </Link>
                    </td>
                    <td>{j.edad ?? '—'}</td>
                    <td>{j.peso ? `${j.peso} kg` : '—'}</td>
                    <td>{j.altura ? `${j.altura} m` : '—'}</td>
                    <td>
                      {j.usuario_id ? (
                        <span className="badge badge-success">Vinculada</span>
                      ) : (
                        <span className="badge badge-warning">Sin vincular</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
