// Funciones puras de geometría/dibujo compartidas por los distintos editores
// de pizarra táctica (CanchaEditor clásico y, a partir de la sección
// "pizarra" nueva, PizarraTactica). Sin estado ni JSX: solo cálculo.

// Puntos en zigzag entre (x1,y1) y (x2,y2), para la variante de línea
// "Ondulada" (representa conducción/gambeta, a diferencia de la línea
// recta que representa un pase). Se calcula una sola vez al soltar el
// mouse, no en cada movimiento.
export const puntosOndulados = (x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const largo = Math.hypot(dx, dy)
  if (largo < 1) return [x1, y1, x2, y2]
  const ux = dx / largo
  const uy = dy / largo
  const px = -uy
  const py = ux
  const segmentos = Math.max(4, Math.round(largo / 18))
  const amplitud = 8
  const puntos = [x1, y1]
  for (let i = 1; i < segmentos; i++) {
    const t = i / segmentos
    const signo = i % 2 === 0 ? 1 : -1
    puntos.push(x1 + dx * t + px * amplitud * signo, y1 + dy * t + py * amplitud * signo)
  }
  puntos.push(x2, y2)
  return puntos
}

// Punta de "bloqueo": una barrita perpendicular al final de la línea, como
// una señal de tope/límite (en vez de punta de flecha).
export const puntosBarraBloqueo = (points) => {
  const n = points.length
  const [x1, y1, x2, y2] = [points[n - 4], points[n - 3], points[n - 2], points[n - 1]]
  const angulo = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2
  const largo = 9
  return [
    x2 - Math.cos(angulo) * largo,
    y2 - Math.sin(angulo) * largo,
    x2 + Math.cos(angulo) * largo,
    y2 + Math.sin(angulo) * largo,
  ]
}

// Punto a lo largo de una polilínea (puntos [x1,y1,x2,y2,...]) a una
// fracción t (0 a 1) de su largo total. Sirve para animar a un jugador
// deslizándose por su línea, sea recta, "curva" (el punto de control
// intermedio se camina como un tramo más) u ondulada. También es la base
// de la interpolación entre escenas del sistema de animación nuevo.
export const puntoEnPolilinea = (points, t) => {
  const segmentos = []
  let total = 0
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i]
    const y1 = points[i + 1]
    const x2 = points[i + 2]
    const y2 = points[i + 3]
    const largo = Math.hypot(x2 - x1, y2 - y1)
    segmentos.push({ x1, y1, x2, y2, largo })
    total += largo
  }
  if (segmentos.length === 0) return { x: points[0], y: points[1] }
  if (total === 0) return { x: segmentos[0].x1, y: segmentos[0].y1 }

  let recorrido = Math.max(0, Math.min(1, t)) * total
  for (const s of segmentos) {
    if (recorrido <= s.largo) {
      const frac = s.largo === 0 ? 0 : recorrido / s.largo
      return { x: s.x1 + (s.x2 - s.x1) * frac, y: s.y1 + (s.y2 - s.y1) * frac }
    }
    recorrido -= s.largo
  }
  const ultimo = segmentos[segmentos.length - 1]
  return { x: ultimo.x2, y: ultimo.y2 }
}

// Genera (y cachea por color) una imagen chica con rayas diagonales, para
// el relleno "con rayas" de las figuras/zonas — alternativa al relleno liso.
const patronesRayasCache = {}
export const generarPatronRayas = (color, onListo) => {
  if (patronesRayasCache[color]) return patronesRayasCache[color]
  const size = 10
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 2.5
  ;[-size, 0, size].forEach((offset) => {
    ctx.beginPath()
    ctx.moveTo(offset, size)
    ctx.lineTo(offset + size, 0)
    ctx.stroke()
  })
  const img = new window.Image()
  img.onload = () => onListo(img)
  img.src = canvas.toDataURL()
  patronesRayasCache[color] = img
  return img
}

// Puntos del rombo inscripto en el rectángulo (x,y,width,height) de una
// zona/forma.
export const puntosRombo = (x, y, width, height) => [
  x + width / 2, y,
  x + width, y + height / 2,
  x + width / 2, y + height,
  x, y + height / 2,
]
