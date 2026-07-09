import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children }) {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="pantalla-carga">
        <div className="spinner spinner-dark" />
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/" replace />
  }

  return children
}
