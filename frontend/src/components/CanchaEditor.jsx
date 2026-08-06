import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Circle, Ellipse, Arrow, Text, Group, Arc, Path } from 'react-konva'
import './CanchaEditor.css'

const ANCHO = 420

const CAMPOS = {
  completa: { alto: 630, mitad: false },
  media: { alto: 340, mitad: true },
}

// Solo verde y blanco: son las únicas dos opciones de color de campo que
// se pueden combinar libremente con líneas (con/sin) y tamaño (entero/mitad).
const COLORES_CAMPO = {
  verde: { fondo: '#2f8f4e', linea: 'rgba(255,255,255,0.85)' },
  blanco: { fondo: '#f4f4f2', linea: 'rgba(30,30,30,0.55)' },
}

const PALETA = ['#64252F', '#B4984A', '#1d4ed8', '#111827', '#ffffff', '#e11d48']
const TAMANOS = [
  { valor: 2, etiqueta: 'Chico' },
  { valor: 4, etiqueta: 'Mediano' },
  { valor: 7, etiqueta: 'Grande' },
]

// Patrones de guiones para las variantes de trazo de una línea/flecha:
// punteada = puntos chicos y seguidos, discontinua = guiones más largos y
// separados. "Sólida" no tiene dash. Se calcula a partir de "estilo" (nuevo)
// o, si el dibujo es viejo, del booleano "punteada" que se usaba antes.
const PATRONES_TRAZO = { punteada: [1, 6], discontinua: [12, 7] }
const dashDeFlecha = (el) => {
  const estilo = el.estilo || (el.punteada ? 'punteada' : 'solido')
  return estilo === 'solido' ? undefined : PATRONES_TRAZO[estilo]
}

// Puntos en zigzag entre (x1,y1) y (x2,y2), para la variante de línea
// "Ondulada" (representa conducción/gambeta, a diferencia de la línea
// recta que representa un pase). Se calcula una sola vez al soltar el
// mouse, no en cada movimiento.
const puntosOndulados = (x1, y1, x2, y2) => {
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
const puntosBarraBloqueo = (points) => {
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
// intermedio se camina como un tramo más) u ondulada.
const puntoEnPolilinea = (points, t) => {
  const segmentos = []
  let total = 0
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i];
    const y1 = points[i + 1]
    const x2 = points[i + 2];
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
// el relleno "con rayas" de las figuras — alternativa al relleno liso.
const patronesRayasCache = {}
const generarPatronRayas = (color, onListo) => {
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

// Equipo A: Lanús, colores fijos (no se pueden cambiar). Equipo B: colores
// editables, para simular al rival de turno.
const EQUIPO_A_DEFAULT = { color: '#64252F', conNumero: true, estilo: 'circulo' }
const EQUIPO_B_DEFAULT = { color: '#1d4ed8', conNumero: true, estilo: 'circulo' }

// Colores típicos de pechera (bien saturados/flúo, para que se distingan
// de cualquier color de camiseta). Se asignan jugador por jugador.
const COLORES_PECHERA = ['#fbbf24', '#f97316', '#38bdf8', '#ec4899', '#84cc16', '#ffffff']

// Silueta simple de camiseta (hombros -> mangas -> cuerpo -> cuello en V),
// centrada en (0,0), a la misma escala que el círculo de jugador (radio 12).
const JERSEY_PATH =
  'M -5,-9 L -9,-5 L -6,-2 L -6,9 L 6,9 L 6,-2 L 9,-5 L 5,-9 L 2.5,-9 Q 0,-6 -2.5,-9 Z'

// Ficha de un jugador: círculo o camiseta según el estilo del equipo, con
// número opcional (según el equipo) y pechera opcional (según el jugador).
function TokenJugador({ estilo, color, numero, conNumero, pechera }) {
  return (
    <>
      {estilo === 'camiseta' ? (
        <Path data={JERSEY_PATH} fill={color} stroke="#fff" strokeWidth={1} />
      ) : (
        <Circle radius={12} fill={color} stroke="#fff" strokeWidth={1.5} />
      )}
      {pechera && (
        <Rect x={-4.5} y={-5} width={9} height={13} cornerRadius={2} fill={pechera} stroke="#fff" strokeWidth={0.75} opacity={0.92} />
      )}
      {conNumero && (
        <Text
          text={String(numero)}
          fontSize={11}
          fill="#fff"
          width={24}
          height={24}
          align="center"
          verticalAlign="middle"
          offsetX={12}
          offsetY={12}
        />
      )}
    </>
  )
}
const FIGURAS = [
  { valor: 'cono', etiqueta: 'Cono' },
  { valor: 'cuadrado', etiqueta: 'Cuadrado' },
  { valor: 'circulo', etiqueta: 'Círculo' },
  { valor: 'pelota', etiqueta: 'Pelota' },
  { valor: 'bandera', etiqueta: 'Bandera' },
  { valor: 'cruz', etiqueta: 'Marca (X)' },
]

export const ESCENA_VACIA = {
  campo: { tipo: 'completa', color: 'verde', lineas: true },
  equipos: { A: { ...EQUIPO_A_DEFAULT }, B: { ...EQUIPO_B_DEFAULT } },
  jugadores: [],
  flechas: [],
  figuras: [],
  textos: [],
  trazos: [],
  zonas: [],
}

// Completa con valores por defecto lo que un dibujo guardado con una
// versión anterior de la pizarra (sin texto/lápiz/zonas, o sin
// configuración de equipos/pecheras) todavía no tiene.
const normalizarEscena = (v) => ({
  campo: v?.campo || ESCENA_VACIA.campo,
  equipos: {
    A: { ...EQUIPO_A_DEFAULT, ...(v?.equipos?.A || {}) },
    B: { ...EQUIPO_B_DEFAULT, ...(v?.equipos?.B || {}) },
  },
  jugadores: v?.jugadores || [],
  flechas: v?.flechas || [],
  figuras: v?.figuras || [],
  textos: v?.textos || [],
  trazos: v?.trazos || [],
  zonas: v?.zonas || [],
})

let idSeq = 1
const nuevoId = () => `el-${Date.now()}-${idSeq++}`

// Proporciones a escala real de una cancha (105m x 68m — ANCHO=420px equivale
// a 68m, o sea ~6.17px/m), para que el área, el arco y el círculo central se
// vean como los de una cancha de verdad y no un esquema achicado.
const AREA_ANCHO = 260
const AREA_ALTO = 100
const AREA_CHICA_ANCHO = 120
const AREA_CHICA_ALTO = 36
const RADIO_CIRCULO = 55
const PUNTO_PENAL = 70
const RADIO_CORNER = 10

// Ángulo (en grados) donde el círculo del arco del área queda tapado por la
// línea del área: solo se dibuja la porción de afuera (la "D").
const ANGULO_ARCO = (Math.asin((AREA_ALTO - PUNTO_PENAL) / RADIO_CIRCULO) * 180) / Math.PI

function ArcoArea({ x, y, orientacion, color }) {
  const rotacion = orientacion === 'arriba' ? ANGULO_ARCO : 180 + ANGULO_ARCO
  return (
    <Arc
      x={x}
      y={y}
      innerRadius={RADIO_CIRCULO}
      outerRadius={RADIO_CIRCULO}
      angle={180 - ANGULO_ARCO * 2}
      rotation={rotacion}
      stroke={color}
      strokeWidth={2}
    />
  )
}

// Puntos del rombo inscripto en el rectángulo (x,y,width,height) de una
// zona: uno de los 3 tipos de "Figuras" para marcar áreas de trabajo.
const puntosRombo = (x, y, width, height) => [
  x + width / 2, y,
  x + width, y + height / 2,
  x + width / 2, y + height,
  x, y + height / 2,
]

function ArcosCorner({ w, h, color }) {
  return (
    <>
      <Arc x={4} y={4} innerRadius={RADIO_CORNER} outerRadius={RADIO_CORNER} angle={90} rotation={0} stroke={color} strokeWidth={2} />
      <Arc x={w - 4} y={4} innerRadius={RADIO_CORNER} outerRadius={RADIO_CORNER} angle={90} rotation={90} stroke={color} strokeWidth={2} />
      <Arc x={w - 4} y={h - 4} innerRadius={RADIO_CORNER} outerRadius={RADIO_CORNER} angle={90} rotation={180} stroke={color} strokeWidth={2} />
      <Arc x={4} y={h - 4} innerRadius={RADIO_CORNER} outerRadius={RADIO_CORNER} angle={90} rotation={270} stroke={color} strokeWidth={2} />
    </>
  )
}

// Dibuja las líneas de la cancha (todas relativas al ancho/alto del Stage)
function LineasCampo({ tipo, alto, color }) {
  const w = ANCHO
  const h = alto
  const lineas = []

  lineas.push(<Rect key="borde" x={4} y={4} width={w - 8} height={h - 8} stroke={color} strokeWidth={2} />)
  lineas.push(<ArcosCorner key="corners" w={w} h={h} color={color} />)

  if (tipo === 'completa') {
    lineas.push(<Line key="medio" points={[4, h / 2, w - 4, h / 2]} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="circulo" x={w / 2} y={h / 2} radius={RADIO_CIRCULO} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntomedio" x={w / 2} y={h / 2} radius={2.5} fill={color} />)

    // Área y arco superior
    lineas.push(<Rect key="areaSup" x={w / 2 - AREA_ANCHO / 2} y={4} width={AREA_ANCHO} height={AREA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaSup" x={w / 2 - AREA_CHICA_ANCHO / 2} y={4} width={AREA_CHICA_ANCHO} height={AREA_CHICA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoSup" x={w / 2} y={4 + PUNTO_PENAL} radius={2.5} fill={color} />)
    lineas.push(<ArcoArea key="arcoSup" x={w / 2} y={4 + PUNTO_PENAL} orientacion="arriba" color={color} />)

    // Área y arco inferior
    lineas.push(<Rect key="areaInf" x={w / 2 - AREA_ANCHO / 2} y={h - 4 - AREA_ALTO} width={AREA_ANCHO} height={AREA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaInf" x={w / 2 - AREA_CHICA_ANCHO / 2} y={h - 4 - AREA_CHICA_ALTO} width={AREA_CHICA_ANCHO} height={AREA_CHICA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoInf" x={w / 2} y={h - 4 - PUNTO_PENAL} radius={2.5} fill={color} />)
    lineas.push(<ArcoArea key="arcoInf" x={w / 2} y={h - 4 - PUNTO_PENAL} orientacion="abajo" color={color} />)
  } else {
    // Media cancha: solo un área/arco, mirando hacia arriba, con el círculo
    // central asomando desde el borde inferior (la línea de mitad de cancha)
    lineas.push(<Rect key="areaSup" x={w / 2 - AREA_ANCHO / 2} y={4} width={AREA_ANCHO} height={AREA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaSup" x={w / 2 - AREA_CHICA_ANCHO / 2} y={4} width={AREA_CHICA_ANCHO} height={AREA_CHICA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoSup" x={w / 2} y={4 + PUNTO_PENAL} radius={2.5} fill={color} />)
    lineas.push(<ArcoArea key="arcoSup" x={w / 2} y={4 + PUNTO_PENAL} orientacion="arriba" color={color} />)
    lineas.push(<Circle key="circulo" x={w / 2} y={h - 4} radius={RADIO_CIRCULO} stroke={color} strokeWidth={2} />)
  }

  return <>{lineas}</>
}

function FiguraForma({ tipo, color }) {
  if (tipo === 'circulo') return <Circle radius={9} fill={color} />
  if (tipo === 'cuadrado') return <Rect x={-8} y={-8} width={16} height={16} fill={color} />
  if (tipo === 'cono') return <Line points={[0, -10, 9, 9, -9, 9]} closed fill={color} />
  if (tipo === 'pelota') {
    return (
      <>
        <Circle radius={8} fill="#ffffff" stroke="#111827" strokeWidth={1} />
        <Line points={[-4, -2, 4, -2, 2, 5, -2, 5]} closed stroke="#111827" strokeWidth={1} />
      </>
    )
  }
  if (tipo === 'bandera') {
    return (
      <>
        <Line points={[0, 10, 0, -12]} stroke={color} strokeWidth={2} />
        <Line points={[0, -12, 10, -8, 0, -4]} closed fill={color} />
      </>
    )
  }
  if (tipo === 'cruz') {
    return (
      <>
        <Line points={[-7, -7, 7, 7]} stroke={color} strokeWidth={3} />
        <Line points={[-7, 7, 7, -7]} stroke={color} strokeWidth={3} />
      </>
    )
  }
  return null
}

export default function CanchaEditor({ value, onChange, editable }) {
  const escena = normalizarEscena(value)
  const stageRef = useRef(null)
  const internalChangeRef = useRef(false)
  const animacionRef = useRef(null)

  const [animando, setAnimando] = useState(false)
  const [posicionesAnimadas, setPosicionesAnimadas] = useState(null)

  const [herramienta, setHerramienta] = useState('mover')
  const [colorDibujo, setColorDibujo] = useState(PALETA[0])
  const [colorPechera, setColorPechera] = useState(COLORES_PECHERA[0])
  const [mostrarConfigEquipos, setMostrarConfigEquipos] = useState(false)
  const [grosorDibujo, setGrosorDibujo] = useState(4)
  const [curva, setCurva] = useState(false)
  const [punteada, setPunteada] = useState(false)
  const [estiloLinea, setEstiloLinea] = useState('solido')
  const [tipoLinea, setTipoLinea] = useState('flecha')
  const [figuraTipo, setFiguraTipo] = useState('cono')
  const [zonaTipo, setZonaTipo] = useState('rectangulo')
  const [patronRelleno, setPatronRelleno] = useState('ninguno')
  const [patronesListos, setPatronesListos] = useState({})

  // Genera (si hace falta) la imagen de rayas diagonales para un color y,
  // cuando termina de cargar, la deja disponible para usar como relleno.
  const asegurarPatronRayas = (color) => {
    if (patronesListos[color]) return
    generarPatronRayas(color, (img) => setPatronesListos((prev) => (prev[color] ? prev : { ...prev, [color]: img })))
  }
  const [dibujando, setDibujando] = useState(null)
  const [dibujandoZona, setDibujandoZona] = useState(null)
  const [trazoActual, setTrazoActual] = useState(null)
  const [seleccionRect, setSeleccionRect] = useState(null)
  const [seleccionados, setSeleccionados] = useState([])

  const [historial, setHistorial] = useState(() => [normalizarEscena(value)])
  const [indice, setIndice] = useState(0)

  // Si el dibujo que llega por props cambia desde afuera (se cargó otro
  // ejercicio, o es la vista de solo lectura) reiniciamos el historial de
  // deshacer/rehacer. Si el cambio lo generamos nosotros (actualizar/
  // deshacer/rehacer), lo ignoramos para no duplicar la entrada.
  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }
    setHistorial([normalizarEscena(value)])
    setIndice(0)
    setSeleccionados([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const cfgCampo = CAMPOS[escena.campo.tipo] || CAMPOS.completa
  const coloresCampo = COLORES_CAMPO[escena.campo.color] || COLORES_CAMPO.verde
  const alto = cfgCampo.alto

  const actualizar = (cambios) => {
    const nueva = { ...escena, ...cambios }
    internalChangeRef.current = true
    setHistorial((prev) => {
      const recortado = prev.slice(0, indice + 1)
      return [...recortado, nueva]
    })
    setIndice((i) => i + 1)
    onChange(nueva)
  }

  const puedeDeshacer = indice > 0
  const puedeRehacer = indice < historial.length - 1

  const deshacer = () => {
    if (!puedeDeshacer) return
    internalChangeRef.current = true
    setIndice(indice - 1)
    onChange(historial[indice - 1])
  }

  const rehacer = () => {
    if (!puedeRehacer) return
    internalChangeRef.current = true
    setIndice(indice + 1)
    onChange(historial[indice + 1])
  }

  const agregarJugador = (equipo) => {
    const numero = escena.jugadores.filter((j) => j.equipo === equipo).length + 1
    actualizar({
      jugadores: [
        ...escena.jugadores,
        { id: nuevoId(), equipo, numero, pechera: null, x: ANCHO / 2 + (equipo === 'A' ? -60 : 60), y: alto / 2 },
      ],
    })
  }

  // Config de equipo (color, con/sin número, círculo/camiseta): aplica a
  // todos los jugadores de ese equipo a la vez, no jugador por jugador.
  const actualizarEquipo = (equipo, cambios) =>
    actualizar({ equipos: { ...escena.equipos, [equipo]: { ...escena.equipos[equipo], ...cambios } } })

  const moverElemento = (lista, id, x, y) =>
    actualizar({ [lista]: escena[lista].map((el) => (el.id === id ? { ...el, x, y } : el)) })

  const borrarElemento = (lista, id) => actualizar({ [lista]: escena[lista].filter((el) => el.id !== id) })

  const editarTexto = (t) => {
    if (!editable || t.bloqueado) return
    const nuevo = window.prompt('Editar texto', t.texto)
    if (nuevo === null) return
    if (!nuevo.trim()) {
      borrarElemento('textos', t.id)
      return
    }
    actualizar({ textos: escena.textos.map((x) => (x.id === t.id ? { ...x, texto: nuevo.trim() } : x)) })
  }

  const vaciarCancha = () => {
    if (!window.confirm('¿Vaciar todo el dibujo de la cancha?')) return
    actualizar({ jugadores: [], flechas: [], figuras: [], textos: [], trazos: [], zonas: [] })
    setSeleccionados([])
  }

  const estaSeleccionado = (lista, id) => seleccionados.some((s) => s.lista === lista && s.id === id)

  const toggleSeleccion = (lista, id) => {
    setSeleccionados((prev) =>
      prev.some((s) => s.lista === lista && s.id === id)
        ? prev.filter((s) => !(s.lista === lista && s.id === id))
        : [...prev, { lista, id }]
    )
  }

  const desplazarElemento = (elemento, dx, dy) =>
    elemento.points
      ? { ...elemento, points: elemento.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) }
      : { ...elemento, x: elemento.x + dx, y: elemento.y + dy }

  const eliminarSeleccion = () => {
    if (seleccionados.length === 0) return
    const idsPorLista = {}
    seleccionados.forEach(({ lista, id }) => {
      idsPorLista[lista] = idsPorLista[lista] || new Set()
      idsPorLista[lista].add(id)
    })
    const cambios = {}
    Object.keys(idsPorLista).forEach((lista) => {
      cambios[lista] = escena[lista].filter((el) => !idsPorLista[lista].has(el.id))
    })
    actualizar(cambios)
    setSeleccionados([])
  }

  const duplicarSeleccion = () => {
    if (seleccionados.length === 0) return
    const cambios = {}
    seleccionados.forEach(({ lista, id }) => {
      const base = (cambios[lista] || escena[lista]).find((el) => el.id === id)
      if (!base) return
      const copia = { ...desplazarElemento(base, 20, 20), id: nuevoId() }
      cambios[lista] = [...(cambios[lista] || escena[lista]), copia]
    })
    actualizar(cambios)
    setSeleccionados([])
  }

  const bloquearSeleccion = () => {
    if (seleccionados.length === 0) return
    const cambios = {}
    seleccionados.forEach(({ lista, id }) => {
      const base = cambios[lista] || escena[lista]
      cambios[lista] = base.map((el) => (el.id === id ? { ...el, bloqueado: !el.bloqueado } : el))
    })
    actualizar(cambios)
  }

  // Flechas del teclado para mover la selección de a poco, Supr para
  // borrarla. Solo activo con la herramienta "Seleccionar" y algo elegido.
  useEffect(() => {
    if (!editable || herramienta !== 'seleccionar' || seleccionados.length === 0) return

    const onKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        eliminarSeleccion()
        return
      }
      const paso = e.shiftKey ? 20 : 5
      let dx = 0;
      let dy = 0
      if (e.key === 'ArrowUp') dy = -paso
      else if (e.key === 'ArrowDown') dy = paso
      else if (e.key === 'ArrowLeft') dx = -paso
      else if (e.key === 'ArrowRight') dx = paso
      else return

      e.preventDefault()
      const cambios = {}
      seleccionados.forEach(({ lista, id }) => {
        const base = cambios[lista] || escena[lista]
        cambios[lista] = base.map((el) => (el.id === id && !el.bloqueado ? desplazarElemento(el, dx, dy) : el))
      })
      actualizar(cambios)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, herramienta, seleccionados, escena])

  const posicionRelativa = (stage) => stage.getPointerPosition()

  const onClickElemento = (lista, elemento) => (e) => {
    if (herramienta === 'borrar') {
      if (elemento.bloqueado) return
      e.cancelBubble = true
      borrarElemento(lista, elemento.id)
    } else if (herramienta === 'candado') {
      e.cancelBubble = true
      actualizar({
        [lista]: escena[lista].map((el) => (el.id === elemento.id ? { ...el, bloqueado: !el.bloqueado } : el)),
      })
    } else if (herramienta === 'seleccionar') {
      e.cancelBubble = true
      toggleSeleccion(lista, elemento.id)
    } else if (herramienta === 'pechera') {
      if (lista !== 'jugadores') return
      e.cancelBubble = true
      actualizar({
        jugadores: escena.jugadores.map((j) => (j.id === elemento.id ? { ...j, pechera: colorPechera } : j)),
      })
    }
  }

  const onMouseDown = (e) => {
    if (!editable) return
    const stage = e.target.getStage()
    const pos = posicionRelativa(stage)
    if (!pos) return
    const enVacio = e.target === stage

    if (herramienta === 'figura') {
      actualizar({
        figuras: [...escena.figuras, { id: nuevoId(), tipo: figuraTipo, color: colorDibujo, x: pos.x, y: pos.y }],
      })
      return
    }

    if (herramienta === 'texto') {
      const contenido = window.prompt('Texto:')
      if (contenido && contenido.trim()) {
        actualizar({
          textos: [...escena.textos, { id: nuevoId(), x: pos.x, y: pos.y, texto: contenido.trim(), color: colorDibujo }],
        })
      }
      return
    }

    if (herramienta === 'linea') {
      // Si la línea arranca sobre un jugador, queda asociada a él: es lo
      // que permite despúes "Reproducir animación" (el jugador se desliza
      // por esta línea). Si no arranca sobre nadie, es una flecha normal
      // (zona, referencia, etc.) y no anima a nadie.
      const jugadorOrigen = escena.jugadores.find((j) => Math.hypot(j.x - pos.x, j.y - pos.y) < 16)
      setDibujando({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, origenJugadorId: jugadorOrigen?.id || null })
      return
    }

    if (herramienta === 'zona') {
      setDibujandoZona({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
      return
    }

    if (herramienta === 'lapiz') {
      setTrazoActual([pos.x, pos.y])
      return
    }

    if (herramienta === 'seleccionar' && enVacio) {
      if (!e.evt.shiftKey) setSeleccionados([])
      setSeleccionRect({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
    }
  }

  const onMouseMove = (e) => {
    const stage = e.target.getStage()
    const pos = posicionRelativa(stage)
    if (!pos) return
    if (dibujando) setDibujando({ ...dibujando, x2: pos.x, y2: pos.y })
    if (dibujandoZona) setDibujandoZona({ ...dibujandoZona, x2: pos.x, y2: pos.y })
    if (trazoActual) setTrazoActual((prev) => [...prev, pos.x, pos.y])
    if (seleccionRect) setSeleccionRect({ ...seleccionRect, x2: pos.x, y2: pos.y })
  }

  const onMouseUp = () => {
    if (dibujando) {
      const { x1, y1, x2, y2 } = dibujando
      const distancia = Math.hypot(x2 - x1, y2 - y1)
      if (distancia > 8) {
        let points = [x1, y1, x2, y2]
        if (tipoLinea === 'ondulada') {
          points = puntosOndulados(x1, y1, x2, y2)
        } else if (curva) {
          const midX = (x1 + x2) / 2
          const midY = (y1 + y2) / 2
          const dx = x2 - x1
          const dy = y2 - y1
          const offset = 0.25
          const cx = midX - dy * offset
          const cy = midY + dx * offset
          points = [x1, y1, cx, cy, x2, y2]
        }
        actualizar({
          flechas: [
            ...escena.flechas,
            {
              id: nuevoId(),
              points,
              color: colorDibujo,
              estilo: estiloLinea,
              tension: tipoLinea === 'ondulada' ? 0.4 : curva ? 0.5 : 0,
              tipoLinea,
              grosor: grosorDibujo,
              origenJugadorId: dibujando.origenJugadorId || null,
            },
          ],
        })
      }
      setDibujando(null)
    }

    if (dibujandoZona) {
      const { x1, y1, x2, y2 } = dibujandoZona
      const ancho = Math.abs(x2 - x1)
      const altoZona = Math.abs(y2 - y1)
      if (ancho > 8 && altoZona > 8) {
        actualizar({
          zonas: [
            ...escena.zonas,
            {
              id: nuevoId(),
              tipo: zonaTipo,
              x: Math.min(x1, x2),
              y: Math.min(y1, y2),
              width: ancho,
              height: altoZona,
              color: colorDibujo,
              grosor: grosorDibujo,
              punteada,
              patronRelleno,
            },
          ],
        })
      }
      setDibujandoZona(null)
    }

    if (trazoActual) {
      if (trazoActual.length >= 4) {
        actualizar({
          trazos: [...escena.trazos, { id: nuevoId(), points: trazoActual, color: colorDibujo, grosor: grosorDibujo }],
        })
      }
      setTrazoActual(null)
    }

    if (seleccionRect) {
      const xMin = Math.min(seleccionRect.x1, seleccionRect.x2)
      const xMax = Math.max(seleccionRect.x1, seleccionRect.x2)
      const yMin = Math.min(seleccionRect.y1, seleccionRect.y2)
      const yMax = Math.max(seleccionRect.y1, seleccionRect.y2)
      const dentro = (x, y) => x >= xMin && x <= xMax && y >= yMin && y <= yMax

      const nuevos = []
      escena.jugadores.forEach((j) => dentro(j.x, j.y) && nuevos.push({ lista: 'jugadores', id: j.id }))
      escena.figuras.forEach((f) => dentro(f.x, f.y) && nuevos.push({ lista: 'figuras', id: f.id }))
      escena.textos.forEach((t) => dentro(t.x, t.y) && nuevos.push({ lista: 'textos', id: t.id }))

      setSeleccionados((prev) => [
        ...prev,
        ...nuevos.filter((n) => !prev.some((p) => p.lista === n.lista && p.id === n.id)),
      ])
      setSeleccionRect(null)
    }
  }

  // Props de relleno de una zona/figura según su patrón: liso (color
  // semi-transparente) o rayas (imagen de trama, generada bajo demanda).
  const propsRelleno = (patron, color) => {
    if (patron === 'rayas') {
      asegurarPatronRayas(color)
      const img = patronesListos[color]
      return img ? { fillPatternImage: img, fillPatternRepeat: 'repeat' } : { fill: `${color}33` }
    }
    if (patron === 'liso') return { fill: `${color}33` }
    return {}
  }

  // Anima a cada jugador que tenga una línea que arranca en él,
  // deslizándolo desde su posición actual hasta la punta de esa línea. Se
  // reproduce una sola vez, en simultáneo para todos.
  const reproducirAnimacion = () => {
    const tramos = escena.flechas
      .filter((a) => a.origenJugadorId && escena.jugadores.some((j) => j.id === a.origenJugadorId))
      .map((a) => ({ jugadorId: a.origenJugadorId, points: a.points }))

    if (tramos.length === 0) return

    if (animacionRef.current) cancelAnimationFrame(animacionRef.current)
    setAnimando(true)

    const duracionMs = 2200
    const inicio = performance.now()

    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracionMs)
      const nuevas = {}
      tramos.forEach((tramo) => {
        nuevas[tramo.jugadorId] = puntoEnPolilinea(tramo.points, t)
      })
      setPosicionesAnimadas(nuevas)

      if (t < 1) {
        animacionRef.current = requestAnimationFrame(paso)
      } else {
        setAnimando(false)
        animacionRef.current = null
      }
    }
    animacionRef.current = requestAnimationFrame(paso)
  }

  const reiniciarAnimacion = () => {
    if (animacionRef.current) cancelAnimationFrame(animacionRef.current)
    animacionRef.current = null
    setAnimando(false)
    setPosicionesAnimadas(null)
  }

  useEffect(() => {
    return () => {
      if (animacionRef.current) cancelAnimationFrame(animacionRef.current)
    }
  }, [])

  const hayAnimacion = escena.flechas.some(
    (a) => a.origenJugadorId && escena.jugadores.some((j) => j.id === a.origenJugadorId)
  )

  const exportarImagen = () => {
    if (!stageRef.current) return
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = 'pizarra-tactica.png'
    link.href = uri
    link.click()
  }

  return (
    <div className="cancha-editor">
      {editable && (
        <div className="ce-toolbar">
          <div className="ce-grupo">
            <label>Tamaño</label>
            <select value={escena.campo.tipo} onChange={(e) => actualizar({ campo: { ...escena.campo, tipo: e.target.value } })}>
              <option value="completa">Campo entero</option>
              <option value="media">Mitad del campo</option>
            </select>
            <label>Color</label>
            <select value={escena.campo.color} onChange={(e) => actualizar({ campo: { ...escena.campo, color: e.target.value } })}>
              <option value="verde">Verde</option>
              <option value="blanco">Blanco</option>
            </select>
            <label className="ce-check">
              <input
                type="checkbox"
                checked={escena.campo.lineas}
                onChange={(e) => actualizar({ campo: { ...escena.campo, lineas: e.target.checked } })}
              />
              Líneas
            </label>
          </div>

          <div className="ce-grupo">
            <label>Equipos</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => agregarJugador('A')}>+ Jugador A</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => agregarJugador('B')}>+ Jugador B</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrarConfigEquipos(true)}>
              ⚙ Configurar equipos
            </button>
          </div>

          <div className="ce-grupo">
            <label>Herramienta</label>
            <div className="ce-herramientas">
              {['mover', 'seleccionar', 'linea', 'zona', 'lapiz', 'texto', 'figura', 'pechera', 'candado', 'borrar'].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`btn btn-sm ${herramienta === h ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setHerramienta(h)}
                >
                  {{
                    mover: 'Mover',
                    seleccionar: 'Seleccionar',
                    linea: 'Línea',
                    zona: 'Zona',
                    lapiz: 'Lápiz',
                    texto: 'Texto',
                    figura: 'Figura',
                    pechera: 'Pechera',
                    candado: 'Candado',
                    borrar: 'Borrar',
                  }[h]}
                </button>
              ))}
            </div>
          </div>

          {herramienta === 'linea' && (
            <div className="ce-grupo">
              <select value={tipoLinea} onChange={(e) => setTipoLinea(e.target.value)}>
                <option value="flecha">Flecha</option>
                <option value="flecha-doble">Flecha doble</option>
                <option value="linea">Línea</option>
                <option value="ondulada">Ondulada (gambeta)</option>
                <option value="bloqueo">Bloqueo</option>
              </select>
              {tipoLinea !== 'ondulada' && (
                <label className="ce-check">
                  <input type="checkbox" checked={curva} onChange={(e) => setCurva(e.target.checked)} /> Curva
                </label>
              )}
              <select value={estiloLinea} onChange={(e) => setEstiloLinea(e.target.value)}>
                <option value="solido">Sólida</option>
                <option value="punteada">Punteada</option>
                <option value="discontinua">Discontinua</option>
              </select>
              <select value={grosorDibujo} onChange={(e) => setGrosorDibujo(Number(e.target.value))}>
                {TAMANOS.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
            </div>
          )}

          {herramienta === 'zona' && (
            <div className="ce-grupo">
              <select value={zonaTipo} onChange={(e) => setZonaTipo(e.target.value)}>
                <option value="rectangulo">Cuadrado</option>
                <option value="ovalo">Círculo</option>
                <option value="rombo">Rombo</option>
              </select>
              <label className="ce-check">
                <input type="checkbox" checked={punteada} onChange={(e) => setPunteada(e.target.checked)} /> Punteada
              </label>
              <select
                value={patronRelleno}
                onChange={(e) => {
                  setPatronRelleno(e.target.value)
                  if (e.target.value === 'rayas') asegurarPatronRayas(colorDibujo)
                }}
              >
                <option value="ninguno">Sin relleno</option>
                <option value="liso">Relleno liso</option>
                <option value="rayas">Relleno con rayas</option>
              </select>
              <select value={grosorDibujo} onChange={(e) => setGrosorDibujo(Number(e.target.value))}>
                {TAMANOS.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
            </div>
          )}

          {herramienta === 'lapiz' && (
            <div className="ce-grupo">
              <select value={grosorDibujo} onChange={(e) => setGrosorDibujo(Number(e.target.value))}>
                {TAMANOS.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
            </div>
          )}

          {herramienta === 'figura' && (
            <div className="ce-grupo">
              <select value={figuraTipo} onChange={(e) => setFiguraTipo(e.target.value)}>
                {FIGURAS.map((f) => (
                  <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
                ))}
              </select>
            </div>
          )}

          {(herramienta === 'linea' || herramienta === 'zona' || herramienta === 'lapiz' || herramienta === 'figura' || herramienta === 'texto') && (
            <div className="ce-grupo ce-paleta">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ce-swatch ${colorDibujo === c ? 'ce-swatch-activo' : ''}`}
                  style={{ background: c }}
                  onClick={() => {
                    setColorDibujo(c)
                    if (herramienta === 'zona' && patronRelleno === 'rayas') asegurarPatronRayas(c)
                  }}
                />
              ))}
            </div>
          )}

          {herramienta === 'pechera' && (
            <div className="ce-grupo ce-paleta">
              <span className="ce-seleccion-info">Tocá un jugador para ponerle esta pechera:</span>
              {COLORES_PECHERA.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ce-swatch ${colorPechera === c ? 'ce-swatch-activo' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColorPechera(c)}
                />
              ))}
              <button
                type="button"
                className={`btn btn-sm ${colorPechera === null ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setColorPechera(null)}
              >
                Sin pechera
              </button>
            </div>
          )}

          {herramienta === 'seleccionar' && seleccionados.length > 0 && (
            <div className="ce-grupo">
              <span className="ce-seleccion-info">{seleccionados.length} elemento(s) seleccionado(s)</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={duplicarSeleccion}>Duplicar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={bloquearSeleccion}>Bloquear/Desbloquear</button>
              <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={eliminarSeleccion}>Eliminar</button>
            </div>
          )}

          <div className="ce-grupo">
            <button type="button" className="btn btn-ghost btn-sm" onClick={deshacer} disabled={!puedeDeshacer}>↶ Deshacer</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={rehacer} disabled={!puedeRehacer}>↷ Rehacer</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportarImagen}>Exportar imagen</button>
            <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={vaciarCancha}>Vaciar cancha</button>
          </div>
        </div>
      )}

      {mostrarConfigEquipos && (
        <div className="ce-modal-overlay" onClick={() => setMostrarConfigEquipos(false)}>
          <div className="ce-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ce-modal-header">
              <h3>Configurar equipos</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrarConfigEquipos(false)}>
                ✕
              </button>
            </div>

            <div className="ce-modal-equipos">
              <div className="ce-modal-equipo">
                <div className="ce-modal-equipo-header">
                  <span className="ce-modal-equipo-color" style={{ background: escena.equipos.A.color }} />
                  <strong>Lanús</strong>
                </div>
                <p className="texto-muted">Colores fijos del club.</p>

                <label className="ce-check">
                  <input
                    type="checkbox"
                    checked={escena.equipos.A.conNumero}
                    onChange={(e) => actualizarEquipo('A', { conNumero: e.target.checked })}
                  />
                  Con número
                </label>

                <div className="ce-toggle-estilo">
                  <button
                    type="button"
                    className={`btn btn-sm ${escena.equipos.A.estilo === 'circulo' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => actualizarEquipo('A', { estilo: 'circulo' })}
                  >
                    Círculo
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${escena.equipos.A.estilo === 'camiseta' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => actualizarEquipo('A', { estilo: 'camiseta' })}
                  >
                    Camiseta
                  </button>
                </div>
              </div>

              <div className="ce-modal-equipo">
                <div className="ce-modal-equipo-header">
                  <input
                    type="color"
                    className="ce-modal-color-input"
                    value={escena.equipos.B.color}
                    onChange={(e) => actualizarEquipo('B', { color: e.target.value })}
                  />
                  <strong>Equipo rival</strong>
                </div>
                <p className="texto-muted">Elegí el color para simular al equipo de turno.</p>

                <label className="ce-check">
                  <input
                    type="checkbox"
                    checked={escena.equipos.B.conNumero}
                    onChange={(e) => actualizarEquipo('B', { conNumero: e.target.checked })}
                  />
                  Con número
                </label>

                <div className="ce-toggle-estilo">
                  <button
                    type="button"
                    className={`btn btn-sm ${escena.equipos.B.estilo === 'circulo' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => actualizarEquipo('B', { estilo: 'circulo' })}
                  >
                    Círculo
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${escena.equipos.B.estilo === 'camiseta' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => actualizarEquipo('B', { estilo: 'camiseta' })}
                  >
                    Camiseta
                  </button>
                </div>
              </div>
            </div>

            <p className="texto-muted" style={{ marginTop: 14 }}>
              La pechera se asigna jugador por jugador: elegí la herramienta "Pechera" en la barra y tocá al jugador.
            </p>
          </div>
        </div>
      )}

      {hayAnimacion && (
        <div className="ce-animacion-barra" style={{ maxWidth: ANCHO }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={reproducirAnimacion} disabled={animando}>
            {animando ? <span className="spinner" /> : '▶ Reproducir animación'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reiniciarAnimacion} disabled={!posicionesAnimadas && !animando}>
            ↺ Reiniciar
          </button>
        </div>
      )}

      <div className="ce-stage-wrap" style={{ maxWidth: ANCHO }}>
        <Stage
          ref={stageRef}
          width={ANCHO}
          height={alto}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        >
          <Layer>
            <Rect x={0} y={0} width={ANCHO} height={alto} fill={coloresCampo.fondo} />
            {escena.campo.lineas && <LineasCampo tipo={escena.campo.tipo} alto={alto} color={coloresCampo.linea} />}

            {escena.zonas.map((z) => {
              const patron = z.patronRelleno || (z.relleno ? 'liso' : 'ninguno')
              const comun = {
                stroke: z.color,
                strokeWidth: z.grosor || 3,
                dash: z.punteada ? [10, 6] : undefined,
                ...propsRelleno(patron, z.color),
                opacity: z.bloqueado ? 0.55 : 1,
                onClick: onClickElemento('zonas', z),
              }
              if (z.tipo === 'ovalo') {
                return (
                  <Ellipse
                    key={z.id}
                    x={z.x + z.width / 2}
                    y={z.y + z.height / 2}
                    radiusX={z.width / 2}
                    radiusY={z.height / 2}
                    {...comun}
                  />
                )
              }
              if (z.tipo === 'rombo') {
                return <Line key={z.id} points={puntosRombo(z.x, z.y, z.width, z.height)} closed {...comun} />
              }
              return <Rect key={z.id} x={z.x} y={z.y} width={z.width} height={z.height} {...comun} />
            })}
            {dibujandoZona &&
              (() => {
                const x = Math.min(dibujandoZona.x1, dibujandoZona.x2)
                const y = Math.min(dibujandoZona.y1, dibujandoZona.y2)
                const width = Math.abs(dibujandoZona.x2 - dibujandoZona.x1)
                const height = Math.abs(dibujandoZona.y2 - dibujandoZona.y1)
                const comun = {
                  stroke: colorDibujo,
                  strokeWidth: grosorDibujo,
                  dash: punteada ? [10, 6] : undefined,
                  ...propsRelleno(patronRelleno, colorDibujo),
                  opacity: 0.7,
                }
                if (zonaTipo === 'ovalo') {
                  return <Ellipse x={x + width / 2} y={y + height / 2} radiusX={width / 2} radiusY={height / 2} {...comun} />
                }
                if (zonaTipo === 'rombo') {
                  return <Line points={puntosRombo(x, y, width, height)} closed {...comun} />
                }
                return <Rect x={x} y={y} width={width} height={height} {...comun} />
              })()}

            {escena.figuras.map((f) => (
              <Group
                key={f.id}
                x={f.x}
                y={f.y}
                opacity={f.bloqueado ? 0.55 : 1}
                draggable={editable && herramienta === 'mover' && !f.bloqueado}
                onDragEnd={(e) => moverElemento('figuras', f.id, e.target.x(), e.target.y())}
                onClick={onClickElemento('figuras', f)}
              >
                {estaSeleccionado('figuras', f.id) && <Circle radius={16} stroke="#2563eb" strokeWidth={2} dash={[4, 3]} />}
                <FiguraForma tipo={f.tipo} color={f.color} />
              </Group>
            ))}

            {escena.trazos.map((t) => (
              <Line
                key={t.id}
                points={t.points}
                stroke={t.color}
                strokeWidth={t.grosor || 3}
                opacity={t.bloqueado ? 0.55 : 1}
                lineCap="round"
                lineJoin="round"
                tension={0.4}
                onClick={onClickElemento('trazos', t)}
              />
            ))}
            {trazoActual && (
              <Line
                points={trazoActual}
                stroke={colorDibujo}
                strokeWidth={grosorDibujo}
                lineCap="round"
                lineJoin="round"
                tension={0.4}
                opacity={0.7}
              />
            )}

            {escena.flechas.map((a) => {
              const tipo = a.tipoLinea || 'flecha'
              const comun = {
                points: a.points,
                stroke: a.color,
                strokeWidth: a.grosor || 3,
                tension: a.tension || 0,
                dash: dashDeFlecha(a),
                opacity: a.bloqueado ? 0.55 : 1,
                onClick: onClickElemento('flechas', a),
              }
              if (tipo === 'linea') {
                return <Line key={a.id} {...comun} lineCap="round" />
              }
              if (tipo === 'bloqueo') {
                return (
                  <Group key={a.id} opacity={a.bloqueado ? 0.55 : 1} onClick={onClickElemento('flechas', a)}>
                    <Line points={a.points} stroke={a.color} strokeWidth={a.grosor || 3} tension={a.tension || 0} dash={dashDeFlecha(a)} lineCap="round" />
                    <Line points={puntosBarraBloqueo(a.points)} stroke={a.color} strokeWidth={a.grosor || 3} lineCap="round" />
                  </Group>
                )
              }
              return (
                <Arrow
                  key={a.id}
                  {...comun}
                  fill={a.color}
                  pointerAtBeginning={tipo === 'flecha-doble'}
                  pointerAtEnding
                  pointerLength={10}
                  pointerWidth={10}
                />
              )
            })}

            {dibujando && (
              <Arrow
                points={[dibujando.x1, dibujando.y1, dibujando.x2, dibujando.y2]}
                stroke={colorDibujo}
                fill={colorDibujo}
                strokeWidth={grosorDibujo}
                dash={estiloLinea === 'solido' ? undefined : PATRONES_TRAZO[estiloLinea]}
                pointerAtBeginning={tipoLinea === 'flecha-doble'}
                pointerAtEnding={tipoLinea !== 'linea'}
                pointerLength={tipoLinea === 'linea' ? 0 : 10}
                pointerWidth={tipoLinea === 'linea' ? 0 : 10}
                opacity={0.7}
              />
            )}

            {escena.jugadores.map((j) => {
              const cfgEquipo = escena.equipos[j.equipo] || EQUIPO_A_DEFAULT
              const pos = posicionesAnimadas?.[j.id] || { x: j.x, y: j.y }
              return (
                <Group
                  key={j.id}
                  x={pos.x}
                  y={pos.y}
                  opacity={j.bloqueado ? 0.55 : 1}
                  draggable={editable && herramienta === 'mover' && !j.bloqueado && !animando && !posicionesAnimadas}
                  onDragEnd={(e) => moverElemento('jugadores', j.id, e.target.x(), e.target.y())}
                  onClick={onClickElemento('jugadores', j)}
                >
                  {estaSeleccionado('jugadores', j.id) && <Circle radius={16} stroke="#2563eb" strokeWidth={2} dash={[4, 3]} />}
                  <TokenJugador
                    estilo={cfgEquipo.estilo}
                    color={j.color || cfgEquipo.color}
                    numero={j.numero}
                    conNumero={cfgEquipo.conNumero}
                    pechera={j.pechera}
                  />
                </Group>
              )
            })}

            {escena.textos.map((t) => (
              <Group key={t.id}>
                {estaSeleccionado('textos', t.id) && (
                  <Rect x={t.x - 4} y={t.y - 4} width={t.texto.length * 7 + 8} height={20} stroke="#2563eb" dash={[4, 3]} />
                )}
                <Text
                  text={t.texto}
                  x={t.x}
                  y={t.y}
                  fontSize={14}
                  fontStyle="bold"
                  fill={t.color}
                  opacity={t.bloqueado ? 0.55 : 1}
                  draggable={editable && herramienta === 'mover' && !t.bloqueado}
                  onDragEnd={(e) => moverElemento('textos', t.id, e.target.x(), e.target.y())}
                  onClick={onClickElemento('textos', t)}
                  onDblClick={() => editarTexto(t)}
                  onDblTap={() => editarTexto(t)}
                />
              </Group>
            ))}

            {seleccionRect && (
              <Rect
                x={Math.min(seleccionRect.x1, seleccionRect.x2)}
                y={Math.min(seleccionRect.y1, seleccionRect.y2)}
                width={Math.abs(seleccionRect.x2 - seleccionRect.x1)}
                height={Math.abs(seleccionRect.y2 - seleccionRect.y1)}
                stroke="#2563eb"
                dash={[6, 4]}
                fill="rgba(37, 99, 235, 0.08)"
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
