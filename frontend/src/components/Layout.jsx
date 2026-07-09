import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EscudoClub from './EscudoClub'
import './Layout.css'

export default function Layout() {
  const { usuario, esCuerpoTecnico, logout } = useAuth()
  const navigate = useNavigate()

  const salir = () => {
    logout()
    navigate('/login')
  }

  const iniciales = (usuario?.nombre || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-brand">
          <EscudoClub size={36} />
          <div className="navbar-brand-text">
            <strong>Club Atlético Lanús</strong>
            <span>Plataforma de Jugadores</span>
          </div>
        </div>

        <nav className="navbar-links">
          {esCuerpoTecnico ? (
            <>
              <NavLink to="/admin/jugadores" className="navbar-link">
                Jugadores
              </NavLink>
              <NavLink to="/admin/biblioteca" className="navbar-link">
                Biblioteca
              </NavLink>
            </>
          ) : (
            <NavLink to="/biblioteca" className="navbar-link">
              Biblioteca
            </NavLink>
          )}
        </nav>

        <div className="navbar-user">
          <div className="navbar-avatar">{iniciales}</div>
          <div className="navbar-user-text">
            <strong>{usuario?.nombre}</strong>
            <span>{formatearRol(usuario?.rol)}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}

function formatearRol(rol) {
  const nombres = {
    admin: 'Administrador',
    entrenador: 'Entrenador',
    preparador_fisico: 'Preparador físico',
    jugador: 'Jugador',
  }
  return nombres[rol] || rol
}
