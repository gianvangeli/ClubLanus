import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import BibliotecaJugador from './pages/BibliotecaJugador'
import BibliotecaJugadorDetalle from './pages/BibliotecaJugadorDetalle'
import AdminJugadores from './pages/AdminJugadores'
import AdminGeneral from './pages/AdminGeneral'
import AdminJugadorDetalle from './pages/AdminJugadorDetalle'
import JugadorPlanAlimentacion from './pages/JugadorPlanAlimentacion'
import JugadorEntrenamientosExtra from './pages/JugadorEntrenamientosExtra'
import JugadorNutricion from './pages/JugadorNutricion'
import JugadorNutricionEvaluaciones from './pages/JugadorNutricionEvaluaciones'
import JugadorNutricionDieta from './pages/JugadorNutricionDieta'
import AdminObjetivosNutricionales from './pages/AdminObjetivosNutricionales'
import JugadorLesiones from './pages/JugadorLesiones'
import LesionDetalle from './pages/LesionDetalle'
import JugadorPsicologia from './pages/JugadorPsicologia'
import JugadorPreparacionFisica from './pages/JugadorPreparacionFisica'
import JugadorAnalisisFutbolistico from './pages/JugadorAnalisisFutbolistico'
import JugadorDatosBigdata from './pages/JugadorDatosBigdata'
import PsicologoInicio from './pages/PsicologoInicio'
import PsicologoJugador from './pages/PsicologoJugador'
import AdminBiblioteca from './pages/AdminBiblioteca'
import AdminBibliotecaDetalle from './pages/AdminBibliotecaDetalle'
import Entrenamientos from './pages/Entrenamientos'
import EntrenamientoDetalle from './pages/EntrenamientoDetalle'
import EjercicioDetalle from './pages/EjercicioDetalle'
import ReflexionEntrenamiento from './pages/ReflexionEntrenamiento'
import Calendario from './pages/Calendario'
import MicrocicloDetalle from './pages/MicrocicloDetalle'
import NotFound from './pages/NotFound'

const CUERPO_TECNICO = ['admin', 'entrenador', 'preparador_fisico']

function Inicio() {
  const { usuario, cargando } = useAuth()

  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />

  if (CUERPO_TECNICO.includes(usuario.rol)) return <Navigate to="/admin/jugadores" replace />
  if (usuario.rol === 'psicologo') return <Navigate to="/psicologia" replace />
  return <Navigate to="/biblioteca" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

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
              path="/plan-alimentacion"
              element={
                <ProtectedRoute roles={['jugador']}>
                  <JugadorPlanAlimentacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/entrenamientos-extra"
              element={
                <ProtectedRoute roles={['jugador']}>
                  <JugadorEntrenamientosExtra />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/general"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <AdminGeneral />
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
              path="/admin/jugadores/:id/nutricion"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorNutricion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/nutricion/evaluaciones"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorNutricionEvaluaciones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/nutricion/dieta"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorNutricionDieta />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/objetivos-nutricionales"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <AdminObjetivosNutricionales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/lesiones"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorLesiones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/lesiones/:lesionId"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <LesionDetalle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/psicologia"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorPsicologia />
                </ProtectedRoute>
              }
            />
            <Route
              path="/psicologia"
              element={
                <ProtectedRoute roles={['psicologo']}>
                  <PsicologoInicio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/psicologia/:jugadorId"
              element={
                <ProtectedRoute roles={['psicologo']}>
                  <PsicologoJugador />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/preparacion-fisica"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorPreparacionFisica />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/analisis-futbolistico"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorAnalisisFutbolistico />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jugadores/:id/datos"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <JugadorDatosBigdata />
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
              path="/admin/calendario"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <Calendario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/calendario/:id"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <MicrocicloDetalle />
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
            <Route
              path="/entrenamientos/:id"
              element={
                <ProtectedRoute roles={[...CUERPO_TECNICO, 'jugador']}>
                  <EntrenamientoDetalle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/entrenamientos/:id/ejercicios/:ejercicioId"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <EjercicioDetalle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/entrenamientos/:id/reflexion"
              element={
                <ProtectedRoute roles={CUERPO_TECNICO}>
                  <ReflexionEntrenamiento />
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
