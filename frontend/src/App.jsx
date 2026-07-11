import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import BibliotecaJugador from './pages/BibliotecaJugador'
import BibliotecaJugadorDetalle from './pages/BibliotecaJugadorDetalle'
import AdminJugadores from './pages/AdminJugadores'
import AdminJugadorDetalle from './pages/AdminJugadorDetalle'
import AdminBiblioteca from './pages/AdminBiblioteca'
import AdminBibliotecaDetalle from './pages/AdminBibliotecaDetalle'
import Entrenamientos from './pages/Entrenamientos'
import NotFound from './pages/NotFound'

const CUERPO_TECNICO = ['admin', 'entrenador', 'preparador_fisico']

function Inicio() {
  const { usuario, cargando } = useAuth()

  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />

  return CUERPO_TECNICO.includes(usuario.rol) ? (
    <Navigate to="/admin/jugadores" replace />
  ) : (
    <Navigate to="/biblioteca" replace />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Inicio />} />

            <Route
              path="/biblioteca"
              element={
                <ProtectedRoute roles={['jugador']}>
                  <BibliotecaJugador />
                </ProtectedRoute>
              }
            />
            <Route
              path="/biblioteca/:id"
              element={
                <ProtectedRoute roles={['jugador']}>
                  <BibliotecaJugadorDetalle />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/jugadores"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <AdminJugadores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <AdminJugadorDetalle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/biblioteca"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <AdminBiblioteca />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/biblioteca/:id"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <AdminBibliotecaDetalle />
                </ProtectedRoute>
              }
            />

            <Route
              path="/entrenamientos"
              element={
                <ProtectedRoute roles={[...CUERPO_TECNICO, 'jugador']}>
                  <Entrenamientos />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
