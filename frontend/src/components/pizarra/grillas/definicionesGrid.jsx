import { Line } from 'react-konva'

// "Select Grid": overlays de esquema/disposición de cancha, seleccionables
// desde un dropdown en el Manual de Control. Convive con (no reemplaza) el
// selector de tamaño de cancha. Data-driven a propósito: para sumar un
// esquema nuevo alcanza con agregar una entrada acá, sin tocar componentes.
//
// v1: un solo esquema ("Juego posicional" — el único ejemplo que da la
// spec), corredores verticales + tercios horizontales, el overlay estándar
// de juego posicional en el fútbol.
export const DEFINICIONES_GRID = [
  {
    valor: 'posicional',
    etiqueta: 'Juego posicional',
    // Divide la cancha en 5 corredores (vertical) y 3 tercios (horizontal).
    lineas: (w, h, tipo) => {
      const filas = tipo === 'completa' ? 3 : 2
      const cols = 5
      const el = []
      for (let i = 1; i < cols; i++) {
        const x = (w / cols) * i
        el.push(<Line key={`v${i}`} points={[x, 4, x, h - 4]} stroke="#7a1230" strokeWidth={1} dash={[4, 5]} />)
      }
      for (let i = 1; i < filas; i++) {
        const y = (h / filas) * i
        el.push(<Line key={`h${i}`} points={[4, y, w - 4, y]} stroke="#7a1230" strokeWidth={1} dash={[4, 5]} />)
      }
      return el
    },
  },
]
