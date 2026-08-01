import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Circle, Arrow, Text, Group } from 'react-konva'
import './CanchaEditor.css'

const ANCHO = 420

const CAMPOS = {
  completa: { alto: 630, mitad: false },
  media: { alto: 340, mitad: true },
}

const COLORES_CAMPO = {
  verde: { fondo: '#2f8f4e', linea: 'rgba(255,255,255,0.85)' },
  blanco: { fondo: '#f4f4f2', linea: 'rgba(30,30,30,0.55)' },
  negro: { fondo: '#1b1b1b', linea: 'rgba(255,255,255,0.55)' },
}

const PALETA = ['#64252F', '#B4984A', '#1d4ed8', '#111827', '#ffffff', '#e11d48']
const GROSORES = [2, 3, 5, 8]
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
  jugadores: [],
  flechas: [],
  figuras: [],
  textos: [],
  trazos: [],
}

// Completa con arrays vacíos las listas que un dibujo guardado con una
// versión anterior de la pizarra (sin texto/lápiz) todavía no tiene.
const normalizarEscena = (v) => ({
  campo: v?.campo || ESCENA_VACIA.campo,
  jugadores: v?.jugadores || [],
  flechas: v?.flechas || [],
  figuras: v?.figuras || [],
  textos: v?.textos || [],
  trazos: v?.trazos || [],
})

let idSeq = 1
const nuevoId = () => `el-${Date.now()}-${idSeq++}`

// Dibuja las líneas de la cancha (todas relativas al ancho/alto del Stage)
function LineasCampo({ tipo, alto, color }) {
  const w = ANCHO
  const h = alto
  const lineas = []

  lineas.push(<Rect key="borde" x={4} y={4} width={w - 8} height={h - 8} stroke={color} strokeWidth={2} />)

  if (tipo === 'completa') {
    lineas.push(<Line key="medio" points={[4, h / 2, w - 4, h / 2]} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="circulo" x={w / 2} y={h / 2} radius={45} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntomedio" x={w / 2} y={h / 2} radius={2.5} fill={color} />)
    // Área y arco superior
    lineas.push(<Rect key="areaSup" x={w / 2 - 90} y={4} width={180} height={80} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaSup" x={w / 2 - 40} y={4} width={80} height={30} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoSup" x={w / 2} y={68} radius={2.5} fill={color} />)
    // Área y arco inferior
    lineas.push(<Rect key="areaInf" x={w / 2 - 90} y={h - 84} width={180} height={80} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaInf" x={w / 2 - 40} y={h - 34} width={80} height={30} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoInf" x={w / 2} y={h - 68} radius={2.5} fill={color} />)
  } else {
    // Media cancha: solo un área/arco, mirando hacia arriba
    lineas.push(<Rect key="areaSup" x={w / 2 - 90} y={4} width={180} height={110} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaSup" x={w / 2 - 40} y={4} width={80} height={45} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoSup" x={w / 2} y={92} radius={2.5} fill={color} />)
    lineas.push(<Circle key="circulo" x={w / 2} y={h - 4} radius={45} stroke={color} strokeWidth={2} />)
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

  const [herramienta, setHerramienta] = useState('mover')
  const [colorDibujo, setColorDibujo] = useState(PALETA[0])
  const [grosorDibujo, setGrosorDibujo] = useState(3)
  const [curva, setCurva] = useState(false)
  const [punteada, setPunteada] = useState(false)
  const [tipoLinea, setTipoLinea] = useState('flecha')
  const [figuraTipo, setFiguraTipo] = useState('cono')
  const [dibujando, setDibujando] = useState(null)
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
    const color = equipo === 'A' ? '#64252F' : '#1d4ed8'
    const numero = escena.jugadores.filter((j) => j.equipo === equipo).length + 1
    actualizar({
      jugadores: [
        ...escena.jugadores,
        { id: nuevoId(), equipo, numero, color, x: ANCHO / 2 + (equipo === 'A' ? -60 : 60), y: alto / 2 },
      ],
    })
  }

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
    actualizar({ jugadores: [], flechas: [], figuras: [], textos: [], trazos: [] })
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
      setDibujando({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
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
    if (trazoActual) setTrazoActual((prev) => [...prev, pos.x, pos.y])
    if (seleccionRect) setSeleccionRect({ ...seleccionRect, x2: pos.x, y2: pos.y })
  }

  const onMouseUp = () => {
    if (dibujando) {
      const { x1, y1, x2, y2 } = dibujando
      const distancia = Math.hypot(x2 - x1, y2 - y1)
      if (distancia > 8) {
        let points = [x1, y1, x2, y2]
        if (curva) {
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
              punteada,
              tension: curva ? 0.5 : 0,
              tipoLinea,
              grosor: grosorDibujo,
            },
          ],
        })
      }
      setDibujando(null)
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
            <label>Cancha</label>
            <select value={escena.campo.tipo} onChange={(e) => actualizar({ campo: { ...escena.campo, tipo: e.target.value } })}>
              <option value="completa">Completa</option>
              <option value="media">Media cancha</option>
            </select>
            <select value={escena.campo.color} onChange={(e) => actualizar({ campo: { ...escena.campo, color: e.target.value } })}>
              <option value="verde">Pasto verde</option>
              <option value="blanco">Fondo blanco</option>
              <option value="negro">Fondo negro</option>
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
          </div>

          <div className="ce-grupo">
            <label>Herramienta</label>
            <div className="ce-herramientas">
              {['mover', 'seleccionar', 'linea', 'lapiz', 'texto', 'figura', 'candado', 'borrar'].map((h) => (
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
                    lapiz: 'Lápiz',
                    texto: 'Texto',
                    figura: 'Figura',
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
              </select>
              <label className="ce-check">
                <input type="checkbox" checked={curva} onChange={(e) => setCurva(e.target.checked)} /> Curva
              </label>
              <label className="ce-check">
                <input type="checkbox" checked={punteada} onChange={(e) => setPunteada(e.target.checked)} /> Punteada
              </label>
              <select value={grosorDibujo} onChange={(e) => setGrosorDibujo(Number(e.target.value))}>
                {GROSORES.map((g) => (
                  <option key={g} value={g}>{g}px</option>
                ))}
              </select>
            </div>
          )}

          {herramienta === 'lapiz' && (
            <div className="ce-grupo">
              <select value={grosorDibujo} onChange={(e) => setGrosorDibujo(Number(e.target.value))}>
                {GROSORES.map((g) => (
                  <option key={g} value={g}>{g}px</option>
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

          {(herramienta === 'linea' || herramienta === 'lapiz' || herramienta === 'figura' || herramienta === 'texto') && (
            <div className="ce-grupo ce-paleta">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ce-swatch ${colorDibujo === c ? 'ce-swatch-activo' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColorDibujo(c)}
                />
              ))}
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
                dash: a.punteada ? [10, 6] : undefined,
                opacity: a.bloqueado ? 0.55 : 1,
                onClick: onClickElemento('flechas', a),
              }
              if (tipo === 'linea') {
                return <Line key={a.id} {...comun} lineCap="round" />
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
                dash={punteada ? [10, 6] : undefined}
                pointerAtBeginning={tipoLinea === 'flecha-doble'}
                pointerAtEnding={tipoLinea !== 'linea'}
                pointerLength={tipoLinea === 'linea' ? 0 : 10}
                pointerWidth={tipoLinea === 'linea' ? 0 : 10}
                opacity={0.7}
              />
            )}

            {escena.jugadores.map((j) => (
              <Group
                key={j.id}
                x={j.x}
                y={j.y}
                opacity={j.bloqueado ? 0.55 : 1}
                draggable={editable && herramienta === 'mover' && !j.bloqueado}
                onDragEnd={(e) => moverElemento('jugadores', j.id, e.target.x(), e.target.y())}
                onClick={onClickElemento('jugadores', j)}
              >
                {estaSeleccionado('jugadores', j.id) && <Circle radius={16} stroke="#2563eb" strokeWidth={2} dash={[4, 3]} />}
                <Circle radius={12} fill={j.color} stroke="#fff" strokeWidth={1.5} />
                <Text text={String(j.numero)} fontSize={11} fill="#fff" width={24} height={24} align="center" verticalAlign="middle" offsetX={12} offsetY={12} />
              </Group>
            ))}

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
