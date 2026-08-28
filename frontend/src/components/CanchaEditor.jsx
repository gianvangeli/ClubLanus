import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Circle, Ellipse, Arrow, Text, Group, Arc, Path } from 'react-konva'
import api from '../api/client'
import {
  puntosOndulados,
  puntosBarraBloqueo,
  puntoEnPolilinea,
  generarPatronRayas,
  puntosRombo,
} from '../utils/canchaGeometria'
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
export const normalizarEscena = (v) => ({
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

export default function CanchaEditor({ value, onChange, editable, exportable, nombreArchivoExport }) {
  const escena = normalizarEscena(value)
  const stageRef = useRef(null)
  const internalChangeRef = useRef(false)
  const animacionRef = useRef(null)
  const cancelandoTextoRef = useRef(false)

  const [animando, setAnimando] = useState(false)
  const [animPausada, setAnimPausada] = useState(false)
  const [duracionMs, setDuracionMs] = useState(2200)
  const [posicionesAnimadas, setPosicionesAnimadas] = useState(null)
  const [posicionesFigurasAnimadas, setPosicionesFigurasAnimadas] = useState(null)
  const tPausadoRef = useRef(0)

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
  const [editorTexto, setEditorTexto] = useState(null) // { id: string|null, x, y, valor }
  const [fondoTexto, setFondoTexto] = useState(false)
  const [arrastreGrupo, setArrastreGrupo] = useState(null) // { lista, id, dx, dy } — delta del elemento arrastrado, aplicado al resto de la selección
  const [poligonoEnCurso, setPoligonoEnCurso] = useState(null) // { puntos: [x,y,...], cursor: {x,y}|null }
  const [handleCurva, setHandleCurva] = useState(null) // { id, x, y } — arrastre en vivo del punto de control de una flecha curva

  const [plantelA, setPlantelA] = useState([])
  const [plantelError, setPlantelError] = useState(false)
  const [mostrarPlantel, setMostrarPlantel] = useState(false)
  const [hoverJugadorId, setHoverJugadorId] = useState(null)

  // Plantel real de Lanús (equipo A), para poder colocar jugadores
  // vinculados a la base en vez de fichas anónimas. Si falla la carga
  // (red, backend caído), no bloquea el resto de la pizarra: "+ Jugador A"
  // anónimo sigue funcionando igual que siempre.
  useEffect(() => {
    if (!editable) return
    api
      .get('/jugadores')
      .then(({ data }) => setPlantelA(data))
      .catch(() => setPlantelError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable])

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

  const agregarJugador = (equipo, extra = {}) => {
    const usados = escena.jugadores.filter((j) => j.equipo === equipo).map((j) => j.numero || 0)
    const numero = usados.length ? Math.max(...usados) + 1 : 1
    actualizar({
      jugadores: [
        ...escena.jugadores,
        { id: nuevoId(), equipo, numero, pechera: null, x: ANCHO / 2 + (equipo === 'A' ? -60 : 60), y: alto / 2, ...extra },
      ],
    })
  }

  // Coloca un jugador real del plantel (equipo A siempre — el B es el
  // rival genérico, sin vínculo a la base). Permite duplicados a
  // propósito: un CT puede querer marcar al mismo jugador dos veces (p.ej.
  // posición inicial y final). El vínculo es una foto: si el jugador real
  // cambia de nombre/posición después, esta ficha no se actualiza sola.
  const colocarJugadorPlantel = (j) => {
    agregarJugador('A', { jugadorId: j.id, nombre: j.nombre, apellido: j.apellido, posicion: j.posicion || null })
    setMostrarPlantel(false)
  }
  const yaEnCancha = (jugadorId) => escena.jugadores.some((jg) => jg.jugadorId === jugadorId)

  // Config de equipo (color, con/sin número, círculo/camiseta): aplica a
  // todos los jugadores de ese equipo a la vez, no jugador por jugador.
  const actualizarEquipo = (equipo, cambios) =>
    actualizar({ equipos: { ...escena.equipos, [equipo]: { ...escena.equipos[equipo], ...cambios } } })

  const moverElemento = (lista, id, x, y) =>
    actualizar({ [lista]: escena[lista].map((el) => (el.id === id ? { ...el, x, y } : el)) })

  const borrarElemento = (lista, id) => actualizar({ [lista]: escena[lista].filter((el) => el.id !== id) })

  const editarTexto = (t) => {
    if (!editable || t.bloqueado) return
    cancelandoTextoRef.current = false
    setEditorTexto({ id: t.id, x: t.x, y: t.y, valor: t.texto })
  }

  // Confirma el overlay de texto (Enter o blur): crea el texto nuevo o
  // actualiza el existente; si queda vacío, borra (si era una edición) o
  // simplemente no agrega nada (si era uno nuevo).
  const confirmarEditorTexto = () => {
    if (cancelandoTextoRef.current) {
      cancelandoTextoRef.current = false
      return
    }
    if (!editorTexto) return
    const valor = editorTexto.valor.trim()
    if (!valor) {
      if (editorTexto.id) borrarElemento('textos', editorTexto.id)
      setEditorTexto(null)
      return
    }
    if (editorTexto.id) {
      actualizar({ textos: escena.textos.map((t) => (t.id === editorTexto.id ? { ...t, texto: valor } : t)) })
    } else {
      actualizar({
        textos: [
          ...escena.textos,
          { id: nuevoId(), x: editorTexto.x, y: editorTexto.y, texto: valor, color: colorDibujo, fondo: fondoTexto },
        ],
      })
    }
    setEditorTexto(null)
  }

  // Escape: descarta el overlay sin guardar nada. cancelandoTextoRef evita
  // que el blur que dispara el propio cierre del input termine confirmando
  // igual (la edición ya se marcó como cancelada un instante antes).
  const cancelarEditorTexto = () => {
    cancelandoTextoRef.current = true
    setEditorTexto(null)
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

  // Desplaza toda la selección actual en bloque (dx,dy): la usan tanto el
  // nudge por flechas del teclado como el arrastre con mouse de un grupo.
  const moverSeleccionEnBloque = (dx, dy) => {
    const cambios = {}
    seleccionados.forEach(({ lista, id }) => {
      const base = cambios[lista] || escena[lista]
      cambios[lista] = base.map((el) => (el.id === id && !el.bloqueado ? desplazarElemento(el, dx, dy) : el))
    })
    actualizar(cambios)
  }

  const cerrarPoligono = () => {
    if (!poligonoEnCurso || poligonoEnCurso.puntos.length < 6) return
    actualizar({
      zonas: [
        ...escena.zonas,
        { id: nuevoId(), tipo: 'poligono', puntos: poligonoEnCurso.puntos, color: colorDibujo, grosor: grosorDibujo, punteada, patronRelleno },
      ],
    })
    setPoligonoEnCurso(null)
  }

  const cancelarPoligono = () => setPoligonoEnCurso(null)

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
      moverSeleccionEnBloque(dx, dy)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, herramienta, seleccionados, escena])

  // Escape descarta el polígono en curso, Enter lo cierra (alternativa a
  // doble-click o a click cerca del primer vértice).
  useEffect(() => {
    if (!editable || !poligonoEnCurso) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelarPoligono()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        cerrarPoligono()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, poligonoEnCurso])

  // Atajos Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y para deshacer/rehacer. Se ignoran
  // si el foco está en un input/textarea (p.ej. el overlay de texto), para
  // no pisar el undo nativo de edición de ese campo.
  useEffect(() => {
    if (!editable) return
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        deshacer()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        rehacer()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, indice, historial])

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
    // El fondo verde (Rect "fondo") siempre intercepta el click antes que
    // llegue al Stage — sin esto, un click en pasto "vacío" nunca se
    // detectaba como tal y el rubber-band de selección nunca arrancaba.
    const enVacio = e.target === stage || e.target.name?.() === 'fondo'

    if (herramienta === 'figura') {
      actualizar({
        figuras: [...escena.figuras, { id: nuevoId(), tipo: figuraTipo, color: colorDibujo, x: pos.x, y: pos.y }],
      })
      return
    }

    if (herramienta === 'texto') {
      cancelandoTextoRef.current = false
      setEditorTexto({ id: null, x: pos.x, y: pos.y, valor: '' })
      return
    }

    if (herramienta === 'linea') {
      // Si la línea arranca sobre un jugador (o, si no, sobre una pelota),
      // queda asociada a él/ella: es lo que permite despúes "Reproducir
      // animación" (el jugador o la pelota se desliza por esta línea). Si
      // no arranca sobre nadie, es una flecha normal (zona, referencia,
      // etc.) y no anima a nadie.
      const jugadorOrigen = escena.jugadores.find((j) => Math.hypot(j.x - pos.x, j.y - pos.y) < 16)
      const figuraOrigen =
        !jugadorOrigen && escena.figuras.find((f) => f.tipo === 'pelota' && Math.hypot(f.x - pos.x, f.y - pos.y) < 16)
      setDibujando({
        x1: pos.x,
        y1: pos.y,
        x2: pos.x,
        y2: pos.y,
        origenJugadorId: jugadorOrigen?.id || null,
        origenFiguraId: figuraOrigen?.id || null,
      })
      return
    }

    if (herramienta === 'zona') {
      if (zonaTipo === 'poligono') {
        if (!poligonoEnCurso) {
          setPoligonoEnCurso({ puntos: [pos.x, pos.y], cursor: null })
        } else if (
          poligonoEnCurso.puntos.length >= 6 &&
          Math.hypot(pos.x - poligonoEnCurso.puntos[0], pos.y - poligonoEnCurso.puntos[1]) < 10
        ) {
          cerrarPoligono()
        } else {
          setPoligonoEnCurso({ ...poligonoEnCurso, puntos: [...poligonoEnCurso.puntos, pos.x, pos.y] })
        }
        return
      }
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
    if (dibujandoZona) {
      let x2 = pos.x
      let y2 = pos.y
      if (e.evt.shiftKey) {
        // Shift fuerza forma perfecta: cuadrado/círculo/rombo de lados
        // iguales, tomando el mayor de los dos deltas como lado común.
        const { x1, y1 } = dibujandoZona
        const lado = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
        x2 = x1 + Math.sign(x2 - x1 || 1) * lado
        y2 = y1 + Math.sign(y2 - y1 || 1) * lado
      }
      setDibujandoZona({ ...dibujandoZona, x2, y2 })
    }
    if (trazoActual) setTrazoActual((prev) => [...prev, pos.x, pos.y])
    if (seleccionRect) setSeleccionRect({ ...seleccionRect, x2: pos.x, y2: pos.y })
    if (poligonoEnCurso) setPoligonoEnCurso((prev) => ({ ...prev, cursor: { x: pos.x, y: pos.y } }))
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
              origenFiguraId: dibujando.origenFiguraId || null,
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

  // Anima a cada jugador (o pelota) que tenga una línea que arranca en
  // él/ella, deslizándolo desde su posición actual hasta la punta de esa
  // línea, en simultáneo para todos. También sirve para "Reanudar" tras
  // una pausa: tPausadoRef guarda el progreso (0 a 1) del último frame
  // antes de pausar, y lo usamos para retomar el reloj desde ahí en vez
  // de reiniciar desde el principio.
  const reproducirAnimacion = () => {
    const tramos = escena.flechas
      .filter(
        (a) =>
          (a.origenJugadorId && escena.jugadores.some((j) => j.id === a.origenJugadorId)) ||
          (a.origenFiguraId && escena.figuras.some((f) => f.id === a.origenFiguraId))
      )
      .map((a) =>
        a.origenJugadorId
          ? { tipo: 'jugador', id: a.origenJugadorId, points: a.points }
          : { tipo: 'figura', id: a.origenFiguraId, points: a.points }
      )

    if (tramos.length === 0) return

    if (animacionRef.current) cancelAnimationFrame(animacionRef.current)
    setAnimando(true)
    setAnimPausada(false)

    const inicio = performance.now() - tPausadoRef.current * duracionMs

    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracionMs)
      tPausadoRef.current = t
      const nuevasJ = {}
      const nuevasF = {}
      tramos.forEach((tramo) => {
        const p = puntoEnPolilinea(tramo.points, t)
        if (tramo.tipo === 'jugador') nuevasJ[tramo.id] = p
        else nuevasF[tramo.id] = p
      })
      setPosicionesAnimadas(nuevasJ)
      setPosicionesFigurasAnimadas(nuevasF)

      if (t < 1) {
        animacionRef.current = requestAnimationFrame(paso)
      } else {
        setAnimando(false)
        animacionRef.current = null
      }
    }
    animacionRef.current = requestAnimationFrame(paso)
  }

  const pausarAnimacion = () => {
    if (animacionRef.current) cancelAnimationFrame(animacionRef.current)
    animacionRef.current = null
    setAnimando(false)
    setAnimPausada(true)
  }

  const reiniciarAnimacion = () => {
    if (animacionRef.current) cancelAnimationFrame(animacionRef.current)
    animacionRef.current = null
    tPausadoRef.current = 0
    setAnimando(false)
    setAnimPausada(false)
    setPosicionesAnimadas(null)
    setPosicionesFigurasAnimadas(null)
  }

  useEffect(() => {
    return () => {
      if (animacionRef.current) cancelAnimationFrame(animacionRef.current)
    }
  }, [])

  const hayAnimacion = escena.flechas.some(
    (a) =>
      (a.origenJugadorId && escena.jugadores.some((j) => j.id === a.origenJugadorId)) ||
      (a.origenFiguraId && escena.figuras.some((f) => f.id === a.origenFiguraId))
  )

  const exportarImagen = () => {
    if (!stageRef.current) return
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = nombreArchivoExport || 'pizarra-tactica.png'
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrarPlantel((v) => !v)}>
              Plantel ▾
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => agregarJugador('B')}>+ Jugador B</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrarConfigEquipos(true)}>
              ⚙ Configurar equipos
            </button>
            {mostrarPlantel && (
              <>
                <div className="ce-plantel-catcher" onClick={() => setMostrarPlantel(false)} />
                <div className="ce-plantel-popover">
                  {plantelError && <span className="ce-seleccion-info">No se pudo cargar el plantel</span>}
                  {!plantelError && plantelA.length === 0 && (
                    <span className="ce-seleccion-info">Cargando plantel…</span>
                  )}
                  {plantelA.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      className="btn btn-ghost btn-sm ce-plantel-fila"
                      onClick={() => colocarJugadorPlantel(j)}
                    >
                      {j.nombre} {j.apellido}
                      {j.posicion ? ` · ${j.posicion}` : ''}
                      {yaEnCancha(j.id) ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </>
            )}
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
                <option value="poligono">Polígono</option>
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
              {zonaTipo === 'poligono' && poligonoEnCurso && (
                <span className="ce-seleccion-info">Click para agregar vértices · doble-click o Enter para cerrar · Esc para cancelar</span>
              )}
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

          {herramienta === 'texto' && (
            <div className="ce-grupo">
              <label className="ce-check">
                <input type="checkbox" checked={fondoTexto} onChange={(e) => setFondoTexto(e.target.checked)} /> Fondo
              </label>
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
          {animando ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={pausarAnimacion}>
              ⏸ Pausar
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={reproducirAnimacion}>
              {animPausada ? '▶ Reanudar' : '▶ Reproducir animación'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={reiniciarAnimacion}
            disabled={!posicionesAnimadas && !posicionesFigurasAnimadas && !animando}
          >
            ↺ Reiniciar
          </button>
          <select value={duracionMs} onChange={(e) => setDuracionMs(Number(e.target.value))} disabled={animando}>
            <option value={3500}>Lenta</option>
            <option value={2200}>Normal</option>
            <option value={1200}>Rápida</option>
          </select>
        </div>
      )}

      <div className="ce-stage-wrap" style={{ maxWidth: ANCHO }}>
        {!editable && (exportable ?? editable) && (
          <button type="button" className="btn btn-ghost btn-sm ce-descarga-lectura" onClick={exportarImagen}>
            ⬇ Descargar
          </button>
        )}
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
          onDblClick={cerrarPoligono}
          onDblTap={cerrarPoligono}
        >
          <Layer>
            <Rect name="fondo" x={0} y={0} width={ANCHO} height={alto} fill={coloresCampo.fondo} />
            {escena.campo.lineas && (
              <Group listening={false}>
                <LineasCampo tipo={escena.campo.tipo} alto={alto} color={coloresCampo.linea} />
              </Group>
            )}

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
              if (z.tipo === 'poligono') {
                return <Line key={z.id} points={z.puntos} closed {...comun} />
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

            {poligonoEnCurso && (
              <>
                <Line
                  points={
                    poligonoEnCurso.cursor
                      ? [...poligonoEnCurso.puntos, poligonoEnCurso.cursor.x, poligonoEnCurso.cursor.y]
                      : poligonoEnCurso.puntos
                  }
                  stroke={colorDibujo}
                  strokeWidth={grosorDibujo}
                  dash={[6, 4]}
                  opacity={0.8}
                />
                {Array.from({ length: poligonoEnCurso.puntos.length / 2 }).map((_, i) => (
                  <Circle key={i} x={poligonoEnCurso.puntos[i * 2]} y={poligonoEnCurso.puntos[i * 2 + 1]} radius={4} fill={colorDibujo} />
                ))}
              </>
            )}

            {escena.figuras.map((f) => {
              const offset =
                arrastreGrupo && !(arrastreGrupo.lista === 'figuras' && arrastreGrupo.id === f.id) && estaSeleccionado('figuras', f.id)
                  ? arrastreGrupo
                  : null
              const posAnimada = posicionesFigurasAnimadas?.[f.id]
              const fx = posAnimada ? posAnimada.x : f.x + (offset?.dx || 0)
              const fy = posAnimada ? posAnimada.y : f.y + (offset?.dy || 0)
              const puedeArrastrar =
                editable &&
                !f.bloqueado &&
                !animando &&
                !posicionesFigurasAnimadas &&
                (herramienta === 'mover' || (herramienta === 'seleccionar' && estaSeleccionado('figuras', f.id)))
              return (
                <Group
                  key={f.id}
                  x={fx}
                  y={fy}
                  opacity={f.bloqueado ? 0.55 : 1}
                  draggable={puedeArrastrar}
                  onDragMove={(e) => {
                    if (herramienta === 'seleccionar') {
                      setArrastreGrupo({ lista: 'figuras', id: f.id, dx: e.target.x() - f.x, dy: e.target.y() - f.y })
                    }
                  }}
                  onDragEnd={(e) => {
                    if (herramienta === 'seleccionar') {
                      moverSeleccionEnBloque(e.target.x() - f.x, e.target.y() - f.y)
                      setArrastreGrupo(null)
                    } else {
                      moverElemento('figuras', f.id, e.target.x(), e.target.y())
                    }
                  }}
                  onClick={onClickElemento('figuras', f)}
                >
                  {estaSeleccionado('figuras', f.id) && <Circle radius={16} stroke="#2563eb" strokeWidth={2} dash={[4, 3]} />}
                  <FiguraForma tipo={f.tipo} color={f.color} />
                </Group>
              )
            })}

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
              const puntos =
                handleCurva?.id === a.id
                  ? [a.points[0], a.points[1], handleCurva.x, handleCurva.y, a.points[4], a.points[5]]
                  : a.points
              const comun = {
                points: puntos,
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

            {editable &&
              (() => {
                if (seleccionados.length !== 1 || seleccionados[0].lista !== 'flechas') return null
                const a = escena.flechas.find((f) => f.id === seleccionados[0].id)
                if (!a || !a.points || a.points.length !== 6 || a.bloqueado) return null
                const cx = handleCurva?.id === a.id ? handleCurva.x : a.points[2]
                const cy = handleCurva?.id === a.id ? handleCurva.y : a.points[3]
                return (
                  <Circle
                    x={cx}
                    y={cy}
                    radius={5}
                    fill="#2563eb"
                    stroke="#fff"
                    strokeWidth={1}
                    draggable
                    onDragMove={(e) => setHandleCurva({ id: a.id, x: e.target.x(), y: e.target.y() })}
                    onDragEnd={(e) => {
                      actualizar({
                        flechas: escena.flechas.map((f) =>
                          f.id === a.id
                            ? { ...f, points: [f.points[0], f.points[1], e.target.x(), e.target.y(), f.points[4], f.points[5]] }
                            : f
                        ),
                      })
                      setHandleCurva(null)
                    }}
                  />
                )
              })()}

            {escena.jugadores.map((j) => {
              const cfgEquipo = escena.equipos[j.equipo] || EQUIPO_A_DEFAULT
              const offset =
                arrastreGrupo && !(arrastreGrupo.lista === 'jugadores' && arrastreGrupo.id === j.id) && estaSeleccionado('jugadores', j.id)
                  ? arrastreGrupo
                  : null
              const pos = posicionesAnimadas?.[j.id] || { x: j.x + (offset?.dx || 0), y: j.y + (offset?.dy || 0) }
              const puedeArrastrar =
                editable &&
                !j.bloqueado &&
                !animando &&
                !posicionesAnimadas &&
                (herramienta === 'mover' || (herramienta === 'seleccionar' && estaSeleccionado('jugadores', j.id)))
              return (
                <Group
                  key={j.id}
                  x={pos.x}
                  y={pos.y}
                  opacity={j.bloqueado ? 0.55 : 1}
                  draggable={puedeArrastrar}
                  onDragMove={(e) => {
                    if (herramienta === 'seleccionar') {
                      setArrastreGrupo({ lista: 'jugadores', id: j.id, dx: e.target.x() - j.x, dy: e.target.y() - j.y })
                    }
                  }}
                  onDragEnd={(e) => {
                    if (herramienta === 'seleccionar') {
                      moverSeleccionEnBloque(e.target.x() - j.x, e.target.y() - j.y)
                      setArrastreGrupo(null)
                    } else {
                      moverElemento('jugadores', j.id, e.target.x(), e.target.y())
                    }
                  }}
                  onClick={onClickElemento('jugadores', j)}
                  onMouseEnter={() => setHoverJugadorId(j.id)}
                  onMouseLeave={() => setHoverJugadorId(null)}
                >
                  {estaSeleccionado('jugadores', j.id) && <Circle radius={16} stroke="#2563eb" strokeWidth={2} dash={[4, 3]} />}
                  <TokenJugador
                    estilo={cfgEquipo.estilo}
                    color={j.color || cfgEquipo.color}
                    numero={j.numero}
                    conNumero={cfgEquipo.conNumero}
                    pechera={j.pechera}
                  />
                  {j.apellido && (
                    <Text
                      text={j.apellido}
                      fontSize={9}
                      fontStyle="bold"
                      fill="#fff"
                      stroke="#00000077"
                      strokeWidth={0.6}
                      align="center"
                      width={70}
                      offsetX={35}
                      y={16}
                      listening={false}
                    />
                  )}
                  {hoverJugadorId === j.id && j.nombre && (
                    <Group y={-28} listening={false}>
                      <Rect x={-48} y={-2} width={96} height={16} fill="#111827dd" cornerRadius={4} />
                      <Text
                        text={`${j.nombre} ${j.apellido || ''}${j.posicion ? ' · ' + j.posicion : ''}`}
                        fontSize={9}
                        fill="#fff"
                        width={96}
                        offsetX={48}
                        align="center"
                        y={1}
                      />
                    </Group>
                  )}
                </Group>
              )
            })}

            {escena.textos.map((t) => {
              const offset =
                arrastreGrupo && !(arrastreGrupo.lista === 'textos' && arrastreGrupo.id === t.id) && estaSeleccionado('textos', t.id)
                  ? arrastreGrupo
                  : null
              const tx = t.x + (offset?.dx || 0)
              const ty = t.y + (offset?.dy || 0)
              const puedeArrastrar =
                editable && !t.bloqueado && (herramienta === 'mover' || (herramienta === 'seleccionar' && estaSeleccionado('textos', t.id)))
              return (
                <Group key={t.id}>
                  {estaSeleccionado('textos', t.id) && (
                    <Rect x={tx - 4} y={ty - 4} width={t.texto.length * 7 + 8} height={20} stroke="#2563eb" dash={[4, 3]} />
                  )}
                  {t.fondo && (
                    <Rect x={tx - 4} y={ty - 3} width={t.texto.length * 7 + 8} height={19} fill="#000000aa" cornerRadius={3} />
                  )}
                  <Text
                    text={t.texto}
                    x={tx}
                    y={ty}
                    fontSize={14}
                    fontStyle="bold"
                    fill={t.color}
                    opacity={t.bloqueado ? 0.55 : 1}
                    draggable={puedeArrastrar}
                    onDragMove={(e) => {
                      if (herramienta === 'seleccionar') {
                        setArrastreGrupo({ lista: 'textos', id: t.id, dx: e.target.x() - t.x, dy: e.target.y() - t.y })
                      }
                    }}
                    onDragEnd={(e) => {
                      if (herramienta === 'seleccionar') {
                        moverSeleccionEnBloque(e.target.x() - t.x, e.target.y() - t.y)
                        setArrastreGrupo(null)
                      } else {
                        moverElemento('textos', t.id, e.target.x(), e.target.y())
                      }
                    }}
                    onClick={onClickElemento('textos', t)}
                    onDblClick={() => editarTexto(t)}
                    onDblTap={() => editarTexto(t)}
                  />
                </Group>
              )
            })}

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
        {editorTexto && (
          <input
            className="ce-editor-texto"
            autoFocus
            style={{ left: editorTexto.x, top: editorTexto.y }}
            value={editorTexto.valor}
            onChange={(e) => setEditorTexto({ ...editorTexto, valor: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmarEditorTexto()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelarEditorTexto()
              }
            }}
            onBlur={confirmarEditorTexto}
          />
        )}
      </div>
    </div>
  )
}
