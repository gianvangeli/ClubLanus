import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './MenuSeccionesJugador.css'

// El resto de las secciones del jugador (todo menos Biblioteca y Videos,
// que quedan siempre visibles en la barra) para que el nav no quede
// sobrecargado. Mismo patrón visual que "Áreas del jugador" del cuerpo
// técnico (ver MenuSeccionesJugador.jsx).
const SECCIONES = [
  { key: 'entrenamientos', etiqueta: 'Entrenamientos', icono: 'E', to: '/entrenamientos' },
  { key: 'plan-alimentacion', etiqueta: 'Plan de alimentación', icono: 'PA', to: '/plan-alimentacion' },
  { key: 'entrenamientos-extra', etiqueta: 'Entrenamientos extra', icono: 'EX', to: '/entrenamientos-extra' },
  { key: 'calendario', etiqueta: 'Calendario', icono: 'C', to: '/calendario' },
]

const COLORES = ['msj-icono-granate', 'msj-icono-oro', 'msj-icono-gris']

export default function MenuJugador() {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!abierto) return
    const cerrarSiAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarSiAfuera)
    return () => document.removeEventListener('mousedown', cerrarSiAfuera)
  }, [abierto])

  const esActiva = (to) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <div className="menu-secciones" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm menu-secciones-boton"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
        title="Más secciones"
      >
        <span className="menu-secciones-icono">
          <span />
          <span />
          <span />
        </span>
        Más
      </button>

      {abierto && (
        <div className="msj-panel">
          <div className="msj-lista">
            {SECCIONES.map((seccion, i) => (
              <Link
                key={seccion.key}
                to={seccion.to}
                className={`msj-item ${esActiva(seccion.to) ? 'msj-item-activo' : ''}`}
                onClick={() => setAbierto(false)}
              >
                <span className={`msj-item-icono ${COLORES[i % COLORES.length]}`}>{seccion.icono}</span>
                <span className="msj-item-etiqueta">{seccion.etiqueta}</span>
                {esActiva(seccion.to) && <span className="msj-item-check">✓</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
