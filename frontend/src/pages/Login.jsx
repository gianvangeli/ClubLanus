import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { extraerError } from '../api/client'
import EscudoClub from '../components/EscudoClub'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(extraerError(err, 'No se pudo iniciar sesión'))
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

        <h1>Iniciar sesión</h1>
        <p className="auth-subtitle">Ingresá con tu email y contraseña</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={cargando}>
            {cargando ? <span className="spinner" /> : 'Ingresar'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Sos jugador y no tenés cuenta? <Link to="/registro">Registrate acá</Link>
        </p>
      </div>
    </div>
  )
}
