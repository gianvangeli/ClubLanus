import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EscudoClub from './EscudoClub'
import NotificacionesCampana from './NotificacionesCampana'
import MenuJugador from './MenuJugador'
import UsuarioMenu from './UsuarioMenu'
import './Layout.css'

export default function Layout() {
  const { usuario, esCuerpoTecnico, logout } = useAuth()
  const navigate = useNavigate()
  const esJugador = usuario?.rol === 'jugador'

  const salir = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-brand">
          <EscudoClub size={36} variante="blanco" />
          <div className="navbar-brand-text">
            <strong>Club Atlético Lanús</strong>
            <span>Plataforma de Jugadores</span>
          </div>
        </div>

        <nav className="navbar-links">
          {esCuerpoTecnico ? (
            <>
              <NavLink to="/admin/general" className="navbar-link">
                General
              </NavLink>
              <NavLink to="/admin/jugadores" className="navbar-link">
                Jugadores
              </NavLink>
              <NavLink to="/admin/biblioteca" className="navbar-link">
                Biblioteca
              </NavLink>
              <NavLink to="/admin/estadisticas-partido" className="navbar-link">
                Estadísticas
              </NavLink>
              <NavLink to="/entrenamientos" className="navbar-link">
                Entrenamientos
              </NavLink>
              <NavLink to="/admin/calendario" className="navbar-link">
                Calendario
              </NavLink>
            </>
          ) : usuario?.rol === 'psicologo' ? (
            <NavLink to="/psicologia" className="navbar-link">
              Psicología
            </NavLink>
          ) : (
            <>
              <NavLink to="/biblioteca" className="navbar-link">
                Biblioteca
              </NavLink>
              <NavLink to="/mis-videos" className="navbar-link">
                Videos
              </NavLink>
              <MenuJugador />
            </>
          )}
        </nav>

        <div className="navbar-user">
          {esJugador && (
            <>
              <NotificacionesCampana />
              <span className="navbar-divisor" />
            </>
          )}
          <UsuarioMenu usuario={usuario} onSalir={salir} />
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
