import { Circle, Rect, Line, Group } from 'react-konva'

// Íconos de "Add Equipment" (sección 5.4) + las formas viejas de "Figuras"
// que ya existían (cuadrado/círculo/cruz), para no perder compatibilidad
// con dibujos guardados antes del rediseño. Todo dibujado centrado en
// (0,0) — la rotación (arcos) la aplica el <Group rotation> del contenedor,
// no el ícono en sí.

function IconoPelota() {
  return (
    <>
      <Circle radius={9} fill="#ffffff" stroke="#241a1e" strokeWidth={1} />
      <Line points={[-4.5, -2, 4.5, -2, 2, 5.5, -2, 5.5]} closed stroke="#241a1e" strokeWidth={1} />
    </>
  )
}

function IconoCono({ color }) {
  return <Line points={[0, -11, 10, 10, -10, 10]} closed fill={color} stroke="#00000022" strokeWidth={1} />
}

function IconoVarilla({ color }) {
  return (
    <>
      <Rect x={-2} y={-16} width={4} height={32} fill={color} cornerRadius={2} />
      <Circle y={-16} radius={3} fill={color} />
    </>
  )
}

// Arco variante 1: marco completo, vista frontal (como se ve de costado en
// la cancha, apoyado sobre la línea de fondo).
function IconoArcoFrontal({ color }) {
  return (
    <>
      <Line points={[-16, 10, -16, -12, 16, -12, 16, 10]} stroke={color} strokeWidth={2.5} lineJoin="round" />
      <Line points={[-16, 10, -16, 4]} stroke={color} strokeWidth={2.5} opacity={0} />
    </>
  )
}

// Arco variante 2: mismo marco, en perspectiva (ángulo de 3/4), como se ve
// dibujado sobre la cancha en planta.
function IconoArcoAngulado({ color }) {
  return (
    <Line
      points={[-15, 9, -15, -10, -6, -13, 15, -13, 15, 6, 6, 9, -15, 9]}
      stroke={color}
      strokeWidth={2.5}
      lineJoin="round"
      closed={false}
    />
  )
}

// Arco variante 3: otro ángulo/tamaño — perfil lateral achicado (visto de
// costado, como el arco que se ve "de canto" en la cancha).
function IconoArcoLateral({ color }) {
  return (
    <>
      <Line points={[-12, 10, -12, -10, 10, -6, 10, 10]} stroke={color} strokeWidth={2.5} lineJoin="round" />
    </>
  )
}

// Arco chico / mini arco: mismo marco frontal, a menor escala.
function IconoArcoChico({ color }) {
  return <Line points={[-10, 7, -10, -8, 10, -8, 10, 7]} stroke={color} strokeWidth={2} lineJoin="round" />
}

// Barrera: fila de maniquíes (usada tanto como pieza de equipamiento suelta
// como para simular una barrera de tiro libre).
function IconoBarrera({ color }) {
  return (
    <>
      {[-10, 0, 10].map((dx) => (
        <Group key={dx} x={dx}>
          <Circle y={-9} radius={3} fill={color} />
          <Rect x={-2.5} y={-6} width={5} height={13} cornerRadius={2} fill={color} />
        </Group>
      ))}
    </>
  )
}

// Maniquí: silueta individual (para formaciones/barreras sueltas).
function IconoManiqui({ color }) {
  return (
    <>
      <Circle y={-10} radius={3.5} fill={color} />
      <Rect x={-3} y={-6} width={6} height={16} cornerRadius={2.5} fill={color} />
    </>
  )
}

function IconoBandera({ color }) {
  return (
    <>
      <Line points={[0, 11, 0, -13]} stroke={color} strokeWidth={2} />
      <Line points={[0, -13, 11, -9, 0, -5]} closed fill={color} />
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

export const EQUIPAMIENTO = [
  { valor: 'pelota', etiqueta: 'Pelota', rotable: false },
  { valor: 'cono', etiqueta: 'Cono', rotable: false },
  { valor: 'varilla', etiqueta: 'Varilla', rotable: true },
  { valor: 'arco1', etiqueta: 'Arco (marco completo)', rotable: true },
  { valor: 'arco2', etiqueta: 'Arco (ángulo distinto)', rotable: true },
  { valor: 'arco3', etiqueta: 'Arco (otro ángulo)', rotable: true },
  { valor: 'barrera', etiqueta: 'Barrera', rotable: true },
  { valor: 'arco_chico', etiqueta: 'Arco chico', rotable: true },
  { valor: 'maniqui', etiqueta: 'Maniquí', rotable: true },
  { valor: 'bandera', etiqueta: 'Bandera', rotable: false },
]

export function renderFiguraEquipamiento(tipo, color, _rotacion) {
  switch (tipo) {
    case 'pelota':
      return <IconoPelota />
    case 'cono':
      return <IconoCono color={color} />
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
