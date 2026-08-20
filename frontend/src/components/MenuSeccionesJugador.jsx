import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './MenuSeccionesJugador.css'

// Cada área del jugador es un módulo independiente (su propia info,
// historial y archivos), accesible desde cualquier página del perfil a
// través de este panel. Para sumar una nueva área, agregarla acá y crear
// su página (ver JugadorLesiones.jsx como modelo).
const SECCIONES = [
  { key: 'presentacion', etiqueta: 'Presentación', icono: 'P', to: (id) => `/admin/jugadores/${id}` },
  { key: 'nutricion', etiqueta: 'Nutrición del jugador', icono: 'N', to: (id) => `/admin/jugadores/${id}/nutricion` },
  { key: 'lesiones', etiqueta: 'Historial de lesiones', icono: 'L', to: (id) => `/admin/jugadores/${id}/lesiones` },
  { key: 'psicologia', etiqueta: 'Psicología del jugador', icono: 'Ps', to: (id) => `/admin/jugadores/${id}/psicologia` },
  { key: 'preparacion-fisica', etiqueta: 'Preparación física', icono: 'PF', to: (id) => `/admin/jugadores/${id}/preparacion-fisica` },
  { key: 'videos', etiqueta: 'Videos', icono: 'V', to: (id) => `/admin/jugadores/${id}/videos` },
  { key: 'analisis-futbolistico', etiqueta: 'Análisis futbolístico', icono: 'AF', to: (id) => `/admin/jugadores/${id}/analisis-futbolistico` },
  { key: 'datos', etiqueta: 'Datos (Big Data)', icono: 'D', to: (id) => `/admin/jugadores/${id}/datos` },
  { key: 'asistente-ia', etiqueta: 'Asistente IA', icono: 'IA', to: (id) => `/admin/jugadores/${id}/asistente-ia` },
]

const COLORES = ['msj-icono-granate', 'msj-icono-oro', 'msj-icono-gris']

export default function MenuSeccionesJugador({ jugadorId, jugadorNombre, activa }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const cerrarSiAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarSiAfuera)
    return () => document.removeEventListener('mousedown', cerrarSiAfuera)
  }, [abierto])

  return (
    <div className="menu-secciones" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm menu-secciones-boton"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
        title="Áreas del jugador"
      >
        <span className="menu-secciones-icono">
          <span />
          <span />
          <span />
        </span>
        Áreas
      </button>

      {abierto && (
        <div className="msj-panel">
          {jugadorNombre && (
            <div className="msj-panel-header">
              <span className="msj-panel-header-titulo">{jugadorNombre}</span>
              <span className="msj-panel-header-sub">Áreas del jugador</span>
            </div>
          )}
          <div className="msj-lista">
            {SECCIONES.map((seccion, i) => (
              <Link
                key={seccion.key}
                to={seccion.to(jugadorId)}
                className={`msj-item ${activa === seccion.key ? 'msj-item-activo' : ''}`}
                onClick={() => setAbierto(false)}
              >
                <span className={`msj-item-icono ${COLORES[i % COLORES.length]}`}>{seccion.icono}</span>
                <span className="msj-item-etiqueta">{seccion.etiqueta}</span>
                {activa === seccion.key && <span className="msj-item-check">✓</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
