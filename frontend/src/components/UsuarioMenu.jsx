import { useEffect, useRef, useState } from 'react'
import './UsuarioMenu.css'

const NOMBRES_ROL = {
  admin: 'Administrador',
  entrenador: 'Entrenador',
  preparador_fisico: 'Preparador físico',
  jugador: 'Jugador',
  psicologo: 'Psicólogo',
}

export default function UsuarioMenu({ usuario, onSalir }) {
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

  const iniciales = (usuario?.nombre || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="usuario-menu" ref={ref}>
      <button
        type="button"
        className="usuario-menu-boton"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
      >
        <span className="navbar-avatar">{iniciales}</span>
        <svg
          className={`usuario-menu-chevron ${abierto ? 'usuario-menu-chevron-abierto' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {abierto && (
        <div className="usuario-menu-panel">
          <div className="usuario-menu-info">
            <strong>{usuario?.nombre}</strong>
            <span>{NOMBRES_ROL[usuario?.rol] || usuario?.rol}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm usuario-menu-salir" onClick={onSalir}>
            Salir
          </button>
        </div>
      )}
    </div>
  )
}
