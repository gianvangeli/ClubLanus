import { useRef, useState } from 'react'
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

export const ESCENA_VACIA = {
  campo: { tipo: 'completa', color: 'verde', lineas: true },
  jugadores: [],
  flechas: [],
  figuras: [],
}

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

export default function CanchaEditor({ value, onChange, editable }) {
  const escena = value || ESCENA_VACIA
  const stageRef = useRef(null)
  const [herramienta, setHerramienta] = useState('mover')
  const [colorDibujo, setColorDibujo] = useState(PALETA[0])
  const [curva, setCurva] = useState(false)
  const [punteada, setPunteada] = useState(false)
  const [figuraTipo, setFiguraTipo] = useState('cono')
  const [dibujando, setDibujando] = useState(null)

  const actualizar = (cambios) => onChange({ ...escena, ...cambios })

  const cfgCampo = CAMPOS[escena.campo.tipo] || CAMPOS.completa
  const coloresCampo = COLORES_CAMPO[escena.campo.color] || COLORES_CAMPO.verde
  const alto = cfgCampo.alto

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

  const vaciarCancha = () => {
    if (!window.confirm('¿Vaciar todo el dibujo de la cancha?')) return
    actualizar({ jugadores: [], flechas: [], figuras: [] })
  }

  const posicionRelativa = (stage) => {
    const pos = stage.getPointerPosition()
    return pos
  }

  const onMouseDown = (e) => {
    if (!editable) return
    if (herramienta !== 'flecha' && herramienta !== 'figura') return

    const stage = e.target.getStage()
    const pos = posicionRelativa(stage)
    if (!pos) return

    if (herramienta === 'figura') {
      actualizar({
        figuras: [...escena.figuras, { id: nuevoId(), tipo: figuraTipo, color: colorDibujo, x: pos.x, y: pos.y }],
      })
      return
    }

    setDibujando({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
  }

  const onMouseMove = (e) => {
    if (!dibujando) return
    const stage = e.target.getStage()
    const pos = posicionRelativa(stage)
    if (!pos) return
    setDibujando({ ...dibujando, x2: pos.x, y2: pos.y })
  }

  const onMouseUp = () => {
    if (!dibujando) return
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
          { id: nuevoId(), points, color: colorDibujo, punteada, tension: curva ? 0.5 : 0 },
        ],
      })
    }
    setDibujando(null)
  }

  const clickBorrable = (lista, id) => (e) => {
    if (herramienta !== 'borrar') return
    e.cancelBubble = true
    borrarElemento(lista, id)
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
              {['mover', 'flecha', 'figura', 'borrar'].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`btn btn-sm ${herramienta === h ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setHerramienta(h)}
                >
                  {{ mover: 'Mover', flecha: 'Flecha', figura: 'Figura', borrar: 'Borrar' }[h]}
                </button>
              ))}
            </div>
          </div>

          {herramienta === 'flecha' && (
            <div className="ce-grupo">
              <label className="ce-check">
                <input type="checkbox" checked={curva} onChange={(e) => setCurva(e.target.checked)} /> Curva
              </label>
              <label className="ce-check">
                <input type="checkbox" checked={punteada} onChange={(e) => setPunteada(e.target.checked)} /> Punteada
              </label>
            </div>
          )}

          {herramienta === 'figura' && (
            <div className="ce-grupo">
              <select value={figuraTipo} onChange={(e) => setFiguraTipo(e.target.value)}>
                <option value="cono">Cono</option>
                <option value="cuadrado">Cuadrado</option>
                <option value="circulo">Círculo</option>
              </select>
            </div>
          )}

          {(herramienta === 'flecha' || herramienta === 'figura') && (
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

          <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={vaciarCancha}>
            Vaciar cancha
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

            {escena.figuras.map((f) => (
              <Group
                key={f.id}
                x={f.x}
                y={f.y}
                draggable={editable && herramienta === 'mover'}
                onDragEnd={(e) => moverElemento('figuras', f.id, e.target.x(), e.target.y())}
                onClick={clickBorrable('figuras', f.id)}
              >
                {f.tipo === 'circulo' && <Circle radius={9} fill={f.color} />}
                {f.tipo === 'cuadrado' && <Rect x={-8} y={-8} width={16} height={16} fill={f.color} />}
                {f.tipo === 'cono' && <Line points={[0, -10, 9, 9, -9, 9]} closed fill={f.color} />}
              </Group>
            ))}

            {escena.flechas.map((a) => (
              <Arrow
                key={a.id}
                points={a.points}
                stroke={a.color}
                fill={a.color}
                strokeWidth={3}
                tension={a.tension || 0}
                dash={a.punteada ? [10, 6] : undefined}
                pointerLength={10}
                pointerWidth={10}
                onClick={clickBorrable('flechas', a.id)}
              />
            ))}

            {dibujando && (
              <Arrow
                points={[dibujando.x1, dibujando.y1, dibujando.x2, dibujando.y2]}
                stroke={colorDibujo}
                fill={colorDibujo}
                strokeWidth={3}
                dash={punteada ? [10, 6] : undefined}
                opacity={0.7}
              />
            )}

            {escena.jugadores.map((j) => (
              <Group
                key={j.id}
                x={j.x}
                y={j.y}
                draggable={editable && herramienta === 'mover'}
                onDragEnd={(e) => moverElemento('jugadores', j.id, e.target.x(), e.target.y())}
                onClick={clickBorrable('jugadores', j.id)}
              >
                <Circle radius={12} fill={j.color} stroke="#fff" strokeWidth={1.5} />
                <Text text={String(j.numero)} fontSize={11} fill="#fff" width={24} height={24} align="center" verticalAlign="middle" offsetX={12} offsetY={12} />
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
