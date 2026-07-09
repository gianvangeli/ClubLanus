import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { extraerError } from '../api/client'
import EscudoClub from '../components/EscudoClub'
import './Auth.css'

export default function Register() {
  const { registrar } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await registrar(nombre, email, password)
      navigate('/')
    } catch (err) {
      setError(extraerError(err, 'No se pudo crear la cuenta'))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <EscudoClub size={52} />
          <div>
            <strong>Club Atlético Lanús</strong>
            <br />
            <span>Plataforma de Jugadores</span>
          </div>
        </div>

        <h1>Crear cuenta de jugador</h1>
        <p className="auth-subtitle">Acceso exclusivo a la Biblioteca de videos</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="nombre">Nombre y apellido</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={cargando}>
            {cargando ? <span className="spinner" /> : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
