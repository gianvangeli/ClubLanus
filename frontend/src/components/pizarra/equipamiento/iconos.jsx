import { Circle, Ellipse, Rect, Line, Group } from 'react-konva'

// Íconos de "Add Equipment" (sección 5.4) + las formas viejas de "Figuras"
// que ya existían (cuadrado/círculo/cruz), para no perder compatibilidad
// con dibujos guardados antes del rediseño. Todo dibujado centrado en
// (0,0) — la rotación (arcos) la aplica el <Group rotation> del contenedor,
// no el ícono en sí.

// Aclara (factor > 0) u oscurece (factor < 0) un color hex mezclándolo con
// blanco/negro — así cada pieza tiene un solo color elegible por el cuerpo
// técnico pero igual se puede dar sensación de volumen (caras claras/
// oscuras, sombreados) sin pedirle un segundo color.
function sombrear(hex, factor) {
  const limpio = (hex || '#4a4a4a').replace('#', '')
  const valido = /^[0-9a-fA-F]{6}$/.test(limpio) ? limpio : '4a4a4a'
  const r = parseInt(valido.slice(0, 2), 16)
  const g = parseInt(valido.slice(2, 4), 16)
  const b = parseInt(valido.slice(4, 6), 16)
  const mezclar = (canal) => {
    const destino = factor >= 0 ? 255 : 0
    const c = Math.round(canal + (destino - canal) * Math.abs(factor))
    return Math.max(0, Math.min(255, c))
  }
  const rHex = mezclar(r).toString(16).padStart(2, '0')
  const gHex = mezclar(g).toString(16).padStart(2, '0')
  const bHex = mezclar(b).toString(16).padStart(2, '0')
  return `#${rHex}${gHex}${bHex}`
}

// Sombra elíptica tenue en la base de una pieza, para asentarla
// visualmente sobre el césped en vez de "flotar".
function SombraBase({ y, rx = 10, ry = 3 }) {
  return <Ellipse y={y} radiusX={rx} radiusY={ry} fill="#00000022" />
}

// Vértices de un polígono regular de `lados` lados, radio `r`, centrado en
// (cx,cy) — se usa para el pentágono central y para ubicar los gajos de
// hexágono a su alrededor con la misma simetría de 5 puntas.
const verticesPoligono = (lados, r, cx = 0, cy = 0, rotacionDeg = -90) =>
  Array.from({ length: lados }, (_, i) => {
    const rad = ((360 / lados) * i + rotacionDeg) * (Math.PI / 180)
    return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r]
  }).flat()

function IconoPelota({ color: _color }) {
  const cy = -1.5 // centro del pentágono, levemente arriba del centro de la pelota
  const pentagono = verticesPoligono(5, 3.3, 0, cy)
  return (
    <>
      <SombraBase y={9.5} rx={7.5} ry={2} />
      {/* Esfera con sombreado radial (luz arriba a la izquierda) en vez de
          relleno plano, para dar sensación de volumen 3D. */}
      <Circle
        radius={9}
        stroke="#241a1e"
        strokeWidth={1}
        fillRadialGradientStartPoint={{ x: -3, y: -4 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: -1, y: -1 }}
        fillRadialGradientEndRadius={12}
        fillRadialGradientColorStops={[0, '#ffffff', 0.55, '#f2f2f2', 1, '#c9c9c9']}
      />
      {/* Gajos de hexágono alrededor del pentágono: una cuña oscura por cada
          lado, en vez de una simple línea — se ve más parecido al panelado
          real de un balón clásico. */}
      {Array.from({ length: 5 }, (_, i) => {
        const ax = pentagono[i * 2]
        const ay = pentagono[i * 2 + 1]
        const bx = pentagono[((i + 1) % 5) * 2]
        const by = pentagono[((i + 1) % 5) * 2 + 1]
        const mx = (ax + bx) / 2
        const my = (ay + by) / 2
        const nx = mx
        const ny = my - cy
        const largo = Math.hypot(nx, ny) || 1
        const puntaX = mx + (nx / largo) * 3.4
        const puntaY = my + (ny / largo) * 3.4
        return <Line key={i} points={[ax, ay, puntaX, puntaY, bx, by]} closed fill="#241a1e" opacity={0.92} />
      })}
      <Line points={pentagono} closed fill="#1a1316" stroke="#000000" strokeWidth={0.5} />
    </>
  )
}

function IconoCono({ color }) {
  const oscuro = sombrear(color, -0.28)
  const claro = sombrear(color, 0.55)
  return (
    <>
      <SombraBase y={11} rx={9} ry={2.5} />
      {/* Cuerpo: trapecio (punta truncada, como un cono real) con el
          costado derecho sombreado para dar volumen. */}
      <Line points={[-2.5, -13, 2.5, -13, 9, 10, -9, 10]} closed fill={color} stroke="#00000022" strokeWidth={1} />
      <Line points={[0, -13, 2.5, -13, 9, 10, 2, 10]} closed fill={oscuro} opacity={0.55} />
      {/* Franja clara típica del cono de entrenamiento. */}
      <Line points={[-6.2, 3.5, 6.2, 3.5, 7.3, 6.5, -7.3, 6.5]} closed fill={claro} opacity={0.85} />
      <Rect x={-2.5} y={-13} width={5} height={2.5} fill={oscuro} cornerRadius={1} />
    </>
  )
}

// Cono plano (disco marcador chato), distinto del cono alto de arriba —
// vista "de 3/4" como se lo ve apoyado en el piso: una elipse de base y una
// más chica y oscura encima simulando el botón central de los marcadores
// reales.
function IconoConoPlano({ color }) {
  const oscuro = sombrear(color, -0.3)
  const claro = sombrear(color, 0.35)
  return (
    <>
      <SombraBase y={5.5} rx={9} ry={2.6} />
      <Ellipse y={2} radiusX={9} radiusY={4} fill={color} stroke="#00000022" strokeWidth={1} />
      <Ellipse y={1} radiusX={9} radiusY={4} fill={claro} opacity={0.35} />
      <Ellipse y={1.5} radiusX={3.2} radiusY={1.6} fill={oscuro} />
    </>
  )
}

function IconoVarilla({ color }) {
  const claro = sombrear(color, 0.4)
  const oscuro = sombrear(color, -0.3)
  return (
    <>
      <SombraBase y={16.5} rx={5} ry={1.8} />
      <Rect x={-2} y={-16} width={2} height={32} fill={claro} />
      <Rect x={0} y={-16} width={2} height={32} fill={oscuro} cornerRadius={[0, 2, 2, 0]} />
      <Circle y={-16} radius={3} fill={claro} />
      <Circle y={-16} radius={3} fill={oscuro} opacity={0.4} />
    </>
  )
}

// Red del arco: grilla de líneas finas dentro del marco, más algunas
// diagonales opcionales para sugerir profundidad en las variantes en
// perspectiva (angulado/lateral).
function RedArco({ x1, y1, x2, y2, columnas = 4, filas = 3, diagonales = null }) {
  const lineas = []
  for (let i = 1; i < columnas; i++) {
    const x = x1 + ((x2 - x1) * i) / columnas
    lineas.push(<Line key={`v${i}`} points={[x, y1, x, y2]} stroke="#ffffff" strokeWidth={0.6} opacity={0.55} />)
  }
  for (let i = 1; i < filas; i++) {
    const y = y1 + ((y2 - y1) * i) / filas
    lineas.push(<Line key={`h${i}`} points={[x1, y, x2, y]} stroke="#ffffff" strokeWidth={0.6} opacity={0.55} />)
  }
  if (diagonales) {
    diagonales.forEach((d, i) => lineas.push(<Line key={`d${i}`} points={d} stroke="#ffffff" strokeWidth={0.6} opacity={0.4} />))
  }
  return <>{lineas}</>
}

// Marco con efecto de "caño": línea principal + una más clara y fina
// desplazada, en vez de un trazo plano.
function MarcoConVolumen({ points, color, strokeWidth = 2.5, closed = false }) {
  const claro = sombrear(color, 0.5)
  const desplazado = points.map((v) => v - 0.6)
  return (
    <>
      <Line points={points} stroke={color} strokeWidth={strokeWidth} lineJoin="round" lineCap="round" closed={closed} />
      <Line points={desplazado} stroke={claro} strokeWidth={strokeWidth * 0.35} lineJoin="round" lineCap="round" closed={closed} opacity={0.8} />
    </>
  )
}

// Arco variante 1: marco completo, vista frontal (como se ve de costado en
// la cancha, apoyado sobre la línea de fondo).
function IconoArcoFrontal({ color }) {
  return (
    <>
      <SombraBase y={11} rx={17} ry={3} />
      <RedArco x1={-16} y1={-12} x2={16} y2={10} columnas={4} filas={3} />
      <MarcoConVolumen points={[-16, 10, -16, -12, 16, -12, 16, 10]} color={color} />
    </>
  )
}

// Arco variante 2: mismo marco, en perspectiva (ángulo de 3/4), como se ve
// dibujado sobre la cancha en planta.
function IconoArcoAngulado({ color }) {
  return (
    <>
      <SombraBase y={7} rx={16} ry={3} />
      <RedArco
        x1={-13}
        y1={-11}
        x2={13}
        y2={6}
        columnas={4}
        filas={2}
        diagonales={[
          [-15, -10, -6, -13],
          [15, 6, 6, 9],
        ]}
      />
      <MarcoConVolumen points={[-15, 9, -15, -10, -6, -13, 15, -13, 15, 6, 6, 9, -15, 9]} color={color} />
    </>
  )
}

// Arco variante 3: otro ángulo/tamaño — perfil lateral achicado (visto de
// costado, como el arco que se ve "de canto" en la cancha).
function IconoArcoLateral({ color }) {
  return (
    <>
      <SombraBase y={10} rx={12} ry={2.5} />
      <RedArco x1={-11} y1={-9} x2={9} y2={8} columnas={3} filas={2} diagonales={[[-12, -10, 10, -6]]} />
      <MarcoConVolumen points={[-12, 10, -12, -10, 10, -6, 10, 10]} color={color} />
    </>
  )
}

// Arco chico / mini arco: mismo marco frontal, a menor escala y con red
// más simple (marcador mini, no hace falta tanto detalle).
function IconoArcoChico({ color }) {
  return (
    <>
      <SombraBase y={7.5} rx={11} ry={2.3} />
      <RedArco x1={-10} y1={-8} x2={10} y2={7} columnas={3} filas={2} />
      <MarcoConVolumen points={[-10, 7, -10, -8, 10, -8, 10, 7]} color={color} strokeWidth={2} />
    </>
  )
}

// Barrera: fila de maniquíes (usada tanto como pieza de equipamiento suelta
// como para simular una barrera de tiro libre).
function IconoBarrera({ color }) {
  return (
    <>
      {[-10, 0, 10].map((dx) => (
        <Group key={dx} x={dx}>
          <IconoManiqui color={color} />
        </Group>
      ))}
    </>
  )
}

// Maniquí: silueta individual con dos tonos (frente/costado) para dar
// forma cilíndrica, y una base circular con peso (como los reales).
function IconoManiqui({ color }) {
  const claro = sombrear(color, 0.35)
  const oscuro = sombrear(color, -0.25)
  return (
    <>
      <Ellipse y={9.5} radiusX={5} radiusY={1.8} fill="#00000030" />
      <Ellipse y={8.5} radiusX={4.5} radiusY={1.6} fill={oscuro} />
      <Rect x={-3} y={-6} width={3} height={15} fill={claro} cornerRadius={[2.5, 0, 0, 2.5]} />
      <Rect x={0} y={-6} width={3} height={15} fill={oscuro} cornerRadius={[0, 2.5, 2.5, 0]} />
      <Circle y={-10} radius={3.5} fill={claro} />
      <Circle x={1} y={-10} radius={3.5} fill={oscuro} opacity={0.5} />
    </>
  )
}

function IconoBandera({ color }) {
  const claro = sombrear(color, 0.45)
  return (
    <>
      <Circle y={11} radius={1.8} fill="#00000055" />
      <Line points={[0, 11, 0, -13]} stroke="#5a5a5a" strokeWidth={2} lineCap="round" />
      <Circle y={-13} radius={1.6} fill="#8a8a8a" />
      <Line points={[0, -12, 10, -9.5, 6, -7, 10, -4.5, 0, -2]} tension={0.4} closed fill={color} />
      <Line points={[0, -12, 6, -10, 4, -8, 6, -6, 0, -4]} tension={0.4} closed fill={claro} opacity={0.6} />
    </>
  )
}

// Marcador tipo "pin de mapa": para señalar un punto/objetivo en la
// cancha (target de un ejercicio, punto de referencia), distinto de la
// bandera (asta con banderín) que ya existía.
function IconoMarcador({ color }) {
  return (
    <>
      <SombraBase y={12.5} rx={5} ry={1.6} />
      <Line points={[-4, 0, 4, 0, 0, 12]} closed fill={color} stroke="#00000022" strokeWidth={1} />
      <Circle y={-5} radius={7} fill={color} stroke="#ffffff" strokeWidth={1.5} />
      <Circle y={-5} radius={2.5} fill="#ffffff" />
    </>
  )
}

function IconoCuadrado({ color }) {
  return <Rect x={-8} y={-8} width={16} height={16} fill={color} />
}

function IconoCirculo({ color }) {
  return <Circle radius={9} fill={color} />
}

function IconoCruz({ color }) {
  return (
    <>
      <Line points={[-7, -7, 7, 7]} stroke={color} strokeWidth={3} />
      <Line points={[-7, 7, 7, -7]} stroke={color} strokeWidth={3} />
    </>
  )
}

// Etiquetas cortas a propósito: el popover de Equipamiento muestra la
// vista previa real del ícono (Konva chico) + este nombre como caption
// abajo, no hace falta que el texto solo ya describa el dibujo.
export const EQUIPAMIENTO = [
  { valor: 'pelota', etiqueta: 'Pelota', rotable: false },
  { valor: 'cono', etiqueta: 'Cono grande', rotable: false },
  { valor: 'cono_plano', etiqueta: 'Cono plano', rotable: false },
  { valor: 'varilla', etiqueta: 'Poste', rotable: true },
  { valor: 'arco1', etiqueta: 'Arco frontal', rotable: true },
  { valor: 'arco2', etiqueta: 'Arco angulado', rotable: true },
  { valor: 'arco3', etiqueta: 'Arco lateral', rotable: true },
  { valor: 'arco_chico', etiqueta: 'Arco chico', rotable: true },
  { valor: 'maniqui', etiqueta: 'Maniquí', rotable: true },
  { valor: 'barrera', etiqueta: 'Barrera', rotable: true },
  { valor: 'bandera', etiqueta: 'Bandera', rotable: false },
  { valor: 'marcador', etiqueta: 'Marcador', rotable: false },
]

function iconoPorTipo(tipo, color, _rotacion) {
  switch (tipo) {
    case 'pelota':
      return <IconoPelota color={color} />
    case 'cono':
      return <IconoCono color={color} />
    case 'cono_plano':
      return <IconoConoPlano color={color} />
    case 'varilla':
      return <IconoVarilla color={color} />
    case 'arco1':
      return <IconoArcoFrontal color={color} />
    case 'arco2':
      return <IconoArcoAngulado color={color} />
    case 'arco3':
      return <IconoArcoLateral color={color} />
    case 'barrera':
      return <IconoBarrera color={color} />
    case 'arco_chico':
      return <IconoArcoChico color={color} />
    case 'maniqui':
      return <IconoManiqui color={color} />
    case 'bandera':
      return <IconoBandera color={color} />
    case 'marcador':
      return <IconoMarcador color={color} />
    // Compatibilidad con dibujos viejos (CanchaEditor clásico).
    case 'cuadrado':
      return <IconoCuadrado color={color} />
    case 'circulo':
      return <IconoCirculo color={color} />
    case 'cruz':
      return <IconoCruz color={color} />
    default:
      return <IconoCirculo color={color} />
  }
}

// Área de click/tap más grande que el trazo visible real (~40x40,
// invisible) — Konva testea hits sobre cualquier nodo "listening" sin
// importar su opacidad, así que esto agranda la puntería para
// seleccionar/borrar sin cambiar el dibujo.
export function renderFiguraEquipamiento(tipo, color, rotacion) {
  return (
    <>
      <Rect x={-20} y={-20} width={40} height={40} fill="transparent" />
      {iconoPorTipo(tipo, color, rotacion)}
    </>
  )
}
