import { useEffect, useRef } from 'react'
import { Stage, Layer, Rect, Line, Circle, Ellipse, Arrow, Text, Group, Arc, Transformer } from 'react-konva'
import { puntosBarraBloqueo, puntosRombo } from '../../utils/canchaGeometria'
import { DEFINICIONES_GRID } from './grillas/definicionesGrid'
import { renderFiguraEquipamiento } from './equipamiento/iconos'

// Tipos de zona con geometría x/y/width/height (el "forma libre"/polígono
// queda fuera: son puntos sueltos sin caja delimitadora, no tiene sentido
// redimensionar con el mismo mecanismo — la spec lo marca como opcional).
const ZONA_REDIMENSIONABLE = new Set(['rectangulo', 'ovalo', 'rombo', 'hexagono'])

export const ANCHO = 460

export const CAMPOS = {
  completa: { alto: 690, mitad: false },
  media: { alto: 370, mitad: true },
}

// Paleta institucional (blanco + granate/bordo) — la referencia de la spec
// está en modo oscuro, pero lo que se copia es la estructura, no el color.
const COLORES_CAMPO = {
  verde: { fondo: '#2f8f4e', linea: 'rgba(255,255,255,0.85)' },
  blanco: { fondo: '#fbf7f4', linea: 'rgba(122,18,48,0.45)' },
}

const AREA_ANCHO = 285
const AREA_ALTO = 110
const AREA_CHICA_ANCHO = 132
const AREA_CHICA_ALTO = 40
const RADIO_CIRCULO = 60
const PUNTO_PENAL = 76
const RADIO_CORNER = 11
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
    lineas.push(<Rect key="areaSup" x={w / 2 - AREA_ANCHO / 2} y={4} width={AREA_ANCHO} height={AREA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaSup" x={w / 2 - AREA_CHICA_ANCHO / 2} y={4} width={AREA_CHICA_ANCHO} height={AREA_CHICA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoSup" x={w / 2} y={4 + PUNTO_PENAL} radius={2.5} fill={color} />)
    lineas.push(<ArcoArea key="arcoSup" x={w / 2} y={4 + PUNTO_PENAL} orientacion="arriba" color={color} />)
    lineas.push(<Rect key="areaInf" x={w / 2 - AREA_ANCHO / 2} y={h - 4 - AREA_ALTO} width={AREA_ANCHO} height={AREA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaInf" x={w / 2 - AREA_CHICA_ANCHO / 2} y={h - 4 - AREA_CHICA_ALTO} width={AREA_CHICA_ANCHO} height={AREA_CHICA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoInf" x={w / 2} y={h - 4 - PUNTO_PENAL} radius={2.5} fill={color} />)
    lineas.push(<ArcoArea key="arcoInf" x={w / 2} y={h - 4 - PUNTO_PENAL} orientacion="abajo" color={color} />)
  } else {
    lineas.push(<Rect key="areaSup" x={w / 2 - AREA_ANCHO / 2} y={4} width={AREA_ANCHO} height={AREA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Rect key="areaChicaSup" x={w / 2 - AREA_CHICA_ANCHO / 2} y={4} width={AREA_CHICA_ANCHO} height={AREA_CHICA_ALTO} stroke={color} strokeWidth={2} />)
    lineas.push(<Circle key="puntoSup" x={w / 2} y={4 + PUNTO_PENAL} radius={2.5} fill={color} />)
    lineas.push(<ArcoArea key="arcoSup" x={w / 2} y={4 + PUNTO_PENAL} orientacion="arriba" color={color} />)
    lineas.push(<Circle key="circulo" x={w / 2} y={h - 4} radius={RADIO_CIRCULO} stroke={color} strokeWidth={2} />)
  }
  return <>{lineas}</>
}

function GrillaOverlay({ grid, tipo, alto }) {
  const def = DEFINICIONES_GRID.find((g) => g.valor === grid)
  if (!def) return null
  return <>{def.lineas(ANCHO, alto, tipo)}</>
}

const PATRONES_TRAZO = { punteada: [1, 6], discontinua: [12, 7] }
const dashDeFlecha = (el) => {
  const estilo = el.estilo || (el.punteada ? 'punteada' : 'solido')
  return estilo === 'solido' ? undefined : PATRONES_TRAZO[estilo]
}

const propsRelleno = (patron, color, patronesListos) => {
  if (patron === 'liso') return { fill: color, opacity: 0.35 }
  if (patron === 'rayas') {
    const img = patronesListos?.[color]
    return img ? { fillPatternImage: img, fillPatternRepeat: 'repeat' } : { fill: color, opacity: 0.2 }
  }
  return {}
}

// Ficha "Generic Player": círculo de color con número opcional, sin el
// concepto viejo de "equipo A/B con pechera" — cada ficha lleva su propio
// color y su propio toggle de número.
function TokenJugador({ color, numero, mostrarNumero }) {
  return (
    <>
      <Circle radius={13} fill={color} stroke="#fff" strokeWidth={2} />
      {mostrarNumero && (
        <Text
          text={String(numero ?? '')}
          fontSize={11}
          fontStyle="bold"
          fill="#fff"
          width={26}
          height={26}
          align="center"
          verticalAlign="middle"
          offsetX={13}
          offsetY={13}
        />
      )}
    </>
  )
}

function FiguraForma({ tipo, color, rotacion }) {
  return renderFiguraEquipamiento(tipo, color, rotacion)
}

/**
 * Renderiza UNA escena (fotograma) de la pizarra táctica: la cancha, la
 * grilla opcional y todos los elementos (jugadores/figuras/flechas/
 * textos/trazos/zonas). Se usa tanto para edición interactiva (con
 * `editable`, callbacks de drag/click) como para renderizar cada frame
 * durante la generación de video (offscreen, `editable=false`).
 *
 * No conoce el concepto de "escenas" ni de animación — solo dibuja el
 * estado que recibe. La orquestación de escenas/interpolación vive en
 * PizarraTactica / useVideoRecorder.
 */
export default function CampoLienzo({
  stageRef,
  escena,
  campo,
  editable = false,
  herramienta = 'seleccionar',
  seleccionados = [],
  patronesListos = {},
  dibujoEnCurso, // { tipo:'flecha'|'zona'|'poligono'|'trazo', ...preview }
  handleCurva,
  escala = 1, // factor de escala visual (la cancha se dibuja siempre en el
  // sistema de coordenadas interno ANCHOxalto; esto solo la achica en
  // pantalla para que entre completa sin recortarse — Konva compensa la
  // escala automáticamente en getPointerPosition, así que el resto de la
  // lógica de dibujo no se entera de este número).
  onStageMouseDown,
  onStageMouseMove,
  onStageMouseUp,
  onStageDblClick,
  onClickElemento,
  onMoverElemento,
  onArrastrarHandleCurva,
  onEditarTexto,
  onEditarNumero,
  onRotarFigura,
  onRedimensionarZona,
}) {
  const alto = CAMPOS[campo.tipo]?.alto ?? CAMPOS.completa.alto
  const coloresCampo = COLORES_CAMPO[campo.color] || COLORES_CAMPO.blanco
  const estaSeleccionado = (lista, id) => seleccionados.some((s) => s.lista === lista && s.id === id)
  const click = (lista, el) => (editable ? () => onClickElemento?.(lista, el) : undefined)
  const puedeArrastrar = (el) => editable && !el.bloqueado && (herramienta === 'mover' || (herramienta === 'seleccionar' && estaSeleccionado))
  // Opacidad final de un elemento: si viene con `opacity` explícito (fade
  // in/out calculado por el motor de interpolación de escenas) se respeta
  // tal cual; si no, el criterio de siempre (atenuado si está bloqueado).
  const op = (el) => (el.opacity !== undefined ? el.opacity : el.bloqueado ? 0.55 : 1)

  // Rotar equipamiento (arcos, etc.) y redimensionar formas: un único
  // mecanismo (Transformer de Konva) para ambos, cada uno acotado a lo que
  // pide la spec — el de figuras solo rota (sin anclas de resize), el de
  // zonas solo redimensiona (sin rotar). Se engancha al nodo Konva de la
  // única figura/zona seleccionada; con 0 o 2+ seleccionados, se oculta.
  const figuraNodosRef = useRef({})
  const zonaNodosRef = useRef({})
  const transformerFiguraRef = useRef(null)
  const transformerZonaRef = useRef(null)

  const figuraSeleccionada =
    editable && herramienta === 'seleccionar' && seleccionados.length === 1 && seleccionados[0].lista === 'figuras'
      ? escena.figuras.find((f) => f.id === seleccionados[0].id)
      : null
  const figuraSeleccionadaId = figuraSeleccionada && !figuraSeleccionada.bloqueado ? figuraSeleccionada.id : null
  const zonaSeleccionada =
    editable && herramienta === 'seleccionar' && seleccionados.length === 1 && seleccionados[0].lista === 'zonas'
      ? escena.zonas.find((z) => z.id === seleccionados[0].id)
      : null
  const zonaRedimensionableId = zonaSeleccionada && !zonaSeleccionada.bloqueado && ZONA_REDIMENSIONABLE.has(zonaSeleccionada.tipo) ? zonaSeleccionada.id : null

  useEffect(() => {
    const tr = transformerFiguraRef.current
    if (!tr) return
    const nodo = figuraSeleccionadaId ? figuraNodosRef.current[figuraSeleccionadaId] : null
    tr.nodes(nodo ? [nodo] : [])
    tr.getLayer()?.batchDraw()
  }, [figuraSeleccionadaId, escena.figuras])

  useEffect(() => {
    const tr = transformerZonaRef.current
    if (!tr) return
    const nodo = zonaRedimensionableId ? zonaNodosRef.current[zonaRedimensionableId] : null
    tr.nodes(nodo ? [nodo] : [])
    tr.getLayer()?.batchDraw()
  }, [zonaRedimensionableId, escena.zonas])

  const finalizarRotacionFigura = (id) => (e) => {
    const nodo = e.target
    onRotarFigura?.(id, nodo.rotation())
  }

  // Rect/Rombo/Hexágono: el nodo Konva tiene x/y = esquina superior
  // izquierda de la zona (igual que el modelo), así que el valor final del
  // transform se lee directo.
  const finalizarRedimensionZona = (z) => (e) => {
    const nodo = e.target
    const escalaX = nodo.scaleX()
    const escalaY = nodo.scaleY()
    nodo.scaleX(1)
    nodo.scaleY(1)
    onRedimensionarZona?.(z.id, {
      x: nodo.x(),
      y: nodo.y(),
      width: Math.max(10, z.width * escalaX),
      height: Math.max(10, z.height * escalaY),
    })
  }

  // Círculo/Óvalo: el nodo Konva (Ellipse) usa x/y = CENTRO, no esquina —
  // hay que convertir de vuelta a esquina superior izquierda para el modelo.
  const finalizarRedimensionOvalo = (z) => (e) => {
    const nodo = e.target
    const escalaX = nodo.scaleX()
    const escalaY = nodo.scaleY()
    nodo.scaleX(1)
    nodo.scaleY(1)
    const width = Math.max(10, z.width * escalaX)
    const height = Math.max(10, z.height * escalaY)
    onRedimensionarZona?.(z.id, { x: nodo.x() - width / 2, y: nodo.y() - height / 2, width, height })
  }

  return (
    <Stage
      ref={stageRef}
      width={ANCHO * escala}
      height={alto * escala}
      scaleX={escala}
      scaleY={escala}
      onMouseDown={onStageMouseDown}
      onMouseMove={onStageMouseMove}
      onMouseUp={onStageMouseUp}
      onTouchStart={onStageMouseDown}
      onTouchMove={onStageMouseMove}
      onTouchEnd={onStageMouseUp}
      onDblClick={onStageDblClick}
      onDblTap={onStageDblClick}
    >
      <Layer>
        <Rect name="fondo" x={0} y={0} width={ANCHO} height={alto} fill={coloresCampo.fondo} />
        {campo.lineas && (
          <Group listening={false}>
            <LineasCampo tipo={campo.tipo} alto={alto} color={coloresCampo.linea} />
          </Group>
        )}
        {campo.grid && campo.grid !== 'ninguno' && (
          <Group listening={false} opacity={0.5}>
            <GrillaOverlay grid={campo.grid} tipo={campo.tipo} alto={alto} />
          </Group>
        )}

        {escena.zonas.map((z) => {
          const patron = z.patronRelleno || (z.relleno ? 'liso' : 'ninguno')
          const redimensionable = ZONA_REDIMENSIONABLE.has(z.tipo)
          const comun = {
            stroke: z.color,
            strokeWidth: z.grosor || 3,
            dash: z.punteada ? [10, 6] : undefined,
            ...propsRelleno(patron, z.color, patronesListos),
            opacity: op(z),
            onClick: click('zonas', z),
            draggable: puedeArrastrar(z),
            onDragEnd: (e) => onMoverElemento?.('zonas', z.id, e.target.x(), e.target.y()),
            ref: redimensionable ? (nodo) => { if (nodo) zonaNodosRef.current[z.id] = nodo } : undefined,
            onTransformEnd: redimensionable ? finalizarRedimensionZona(z) : undefined,
          }
          if (estaSeleccionado('zonas', z.id)) comun.stroke = '#7a1230'
          if (z.tipo === 'ovalo') {
            return (
              <Ellipse
                key={z.id}
                x={z.x + z.width / 2}
                y={z.y + z.height / 2}
                radiusX={z.width / 2}
                radiusY={z.height / 2}
                {...comun}
                onTransformEnd={redimensionable ? finalizarRedimensionOvalo(z) : undefined}
              />
            )
          }
          if (z.tipo === 'rombo') {
            return <Line key={z.id} x={z.x} y={z.y} points={puntosRombo(0, 0, z.width, z.height)} closed {...comun} />
          }
          if (z.tipo === 'hexagono') {
            const rx = z.width / 2
            const ry = z.height / 2
            const pts = Array.from({ length: 6 }, (_, i) => {
              const ang = (Math.PI / 3) * i - Math.PI / 2
              return [rx + rx * Math.cos(ang), ry + ry * Math.sin(ang)]
            }).flat()
            return <Line key={z.id} x={z.x} y={z.y} points={pts} closed {...comun} />
          }
          if (z.tipo === 'poligono') {
            return <Line key={z.id} points={z.puntos} closed {...comun} />
          }
          return <Rect key={z.id} x={z.x} y={z.y} width={z.width} height={z.height} {...comun} />
        })}

        {editable && zonaRedimensionableId && (
          <Transformer
            ref={transformerZonaRef}
            rotateEnabled={false}
            flipEnabled={false}
            borderStroke="#7a1230"
            anchorStroke="#7a1230"
            anchorFill="#fff"
            anchorSize={8}
          />
        )}

        {dibujoEnCurso?.tipo === 'zona' && (
          <Rect
            x={Math.min(dibujoEnCurso.x1, dibujoEnCurso.x2)}
            y={Math.min(dibujoEnCurso.y1, dibujoEnCurso.y2)}
            width={Math.abs(dibujoEnCurso.x2 - dibujoEnCurso.x1)}
            height={Math.abs(dibujoEnCurso.y2 - dibujoEnCurso.y1)}
            stroke={dibujoEnCurso.color}
            strokeWidth={dibujoEnCurso.grosor}
            dash={dibujoEnCurso.punteada ? [10, 6] : undefined}
            opacity={0.7}
          />
        )}

        {dibujoEnCurso?.tipo === 'poligono' && (
          <>
            <Line
              points={dibujoEnCurso.cursor ? [...dibujoEnCurso.puntos, dibujoEnCurso.cursor.x, dibujoEnCurso.cursor.y] : dibujoEnCurso.puntos}
              stroke={dibujoEnCurso.color}
              strokeWidth={dibujoEnCurso.grosor}
              dash={[6, 4]}
              opacity={0.8}
            />
            {Array.from({ length: dibujoEnCurso.puntos.length / 2 }).map((_, i) => (
              <Circle key={i} x={dibujoEnCurso.puntos[i * 2]} y={dibujoEnCurso.puntos[i * 2 + 1]} radius={4} fill={dibujoEnCurso.color} />
            ))}
          </>
        )}

        {escena.figuras.map((f) => (
          <Group
            key={f.id}
            ref={(nodo) => { if (nodo) figuraNodosRef.current[f.id] = nodo }}
            x={f.x}
            y={f.y}
            rotation={f.rotacion || 0}
            opacity={op(f)}
            draggable={puedeArrastrar(f)}
            onDragEnd={(e) => onMoverElemento?.('figuras', f.id, e.target.x(), e.target.y())}
            onClick={click('figuras', f)}
            onTransformEnd={finalizarRotacionFigura(f.id)}
          >
            {estaSeleccionado('figuras', f.id) && <Circle radius={18} stroke="#7a1230" strokeWidth={2} dash={[4, 3]} />}
            <FiguraForma tipo={f.tipo} color={f.color} rotacion={f.rotacion} />
          </Group>
        ))}

        {editable && figuraSeleccionadaId && (
          <Transformer
            ref={transformerFiguraRef}
            resizeEnabled={false}
            rotateEnabled
            borderStroke="#7a1230"
            anchorStroke="#7a1230"
            anchorFill="#fff"
            rotateAnchorOffset={22}
          />
        )}

        {escena.trazos.map((t) => (
          <Line
            key={t.id}
            points={t.points}
            stroke={t.color}
            strokeWidth={t.grosor || 3}
            opacity={op(t)}
            lineCap="round"
            lineJoin="round"
            tension={0.4}
            onClick={click('trazos', t)}
          />
        ))}
        {dibujoEnCurso?.tipo === 'trazo' && (
          <Line points={dibujoEnCurso.points} stroke={dibujoEnCurso.color} strokeWidth={dibujoEnCurso.grosor} lineCap="round" lineJoin="round" tension={0.4} opacity={0.7} />
        )}

        {escena.flechas.map((a) => {
          const tipo = a.tipoLinea || 'flecha'
          const puntos = handleCurva?.id === a.id ? [a.points[0], a.points[1], handleCurva.x, handleCurva.y, a.points[4], a.points[5]] : a.points
          const comun = {
            points: puntos,
            stroke: estaSeleccionado('flechas', a.id) ? '#7a1230' : a.color,
            strokeWidth: a.grosor || 3,
            tension: a.tension || 0,
            dash: dashDeFlecha(a),
            opacity: op(a),
            onClick: click('flechas', a),
          }
          if (tipo === 'linea') return <Line key={a.id} {...comun} lineCap="round" />
          if (tipo === 'bloqueo') {
            return (
              <Group key={a.id} opacity={op(a)} onClick={click('flechas', a)}>
                <Line points={puntos} stroke={comun.stroke} strokeWidth={a.grosor || 3} tension={a.tension || 0} dash={dashDeFlecha(a)} lineCap="round" />
                <Line points={puntosBarraBloqueo(puntos)} stroke={comun.stroke} strokeWidth={a.grosor || 3} lineCap="round" />
              </Group>
            )
          }
          return <Arrow key={a.id} {...comun} fill={comun.stroke} pointerAtBeginning={tipo === 'flecha-doble'} pointerAtEnding pointerLength={10} pointerWidth={10} />
        })}
        {dibujoEnCurso?.tipo === 'flecha' && (
          <Arrow
            points={[dibujoEnCurso.x1, dibujoEnCurso.y1, dibujoEnCurso.x2, dibujoEnCurso.y2]}
            stroke={dibujoEnCurso.color}
            fill={dibujoEnCurso.color}
            strokeWidth={dibujoEnCurso.grosor}
            dash={dibujoEnCurso.tipoLinea === 'linea' ? undefined : dashDeFlecha({ estilo: dibujoEnCurso.estilo })}
            pointerAtBeginning={dibujoEnCurso.tipoLinea === 'flecha-doble'}
            pointerAtEnding={dibujoEnCurso.tipoLinea !== 'linea'}
            pointerLength={dibujoEnCurso.tipoLinea === 'linea' ? 0 : 10}
            pointerWidth={dibujoEnCurso.tipoLinea === 'linea' ? 0 : 10}
            opacity={0.7}
          />
        )}

        {editable &&
          seleccionados.length === 1 &&
          seleccionados[0].lista === 'flechas' &&
          (() => {
            const a = escena.flechas.find((f) => f.id === seleccionados[0].id)
            if (!a || !a.points || a.points.length !== 6 || a.bloqueado) return null
            const cx = handleCurva?.id === a.id ? handleCurva.x : a.points[2]
            const cy = handleCurva?.id === a.id ? handleCurva.y : a.points[3]
            return (
              <Circle
                x={cx}
                y={cy}
                radius={5}
                fill="#7a1230"
                stroke="#fff"
                strokeWidth={1}
                draggable
                onDragMove={(e) => onArrastrarHandleCurva?.(a.id, e.target.x(), e.target.y(), false)}
                onDragEnd={(e) => onArrastrarHandleCurva?.(a.id, e.target.x(), e.target.y(), true)}
              />
            )
          })()}

        {escena.jugadores.map((j) => (
          <Group
            key={j.id}
            x={j.x}
            y={j.y}
            opacity={op(j)}
            draggable={puedeArrastrar(j)}
            onDragEnd={(e) => onMoverElemento?.('jugadores', j.id, e.target.x(), e.target.y())}
            onClick={click('jugadores', j)}
            onDblClick={() => onEditarNumero?.(j)}
            onDblTap={() => onEditarNumero?.(j)}
          >
            {estaSeleccionado('jugadores', j.id) && <Circle radius={17} stroke="#7a1230" strokeWidth={2} dash={[4, 3]} />}
            <TokenJugador color={j.color} numero={j.numero} mostrarNumero={j.mostrarNumero !== false} />
          </Group>
        ))}

        {escena.textos.map((t) => (
          <Group key={t.id}>
            {estaSeleccionado('textos', t.id) && (
              <Rect x={t.x - 4} y={t.y - 4} width={t.texto.length * 7 + 8} height={20} stroke="#7a1230" dash={[4, 3]} />
            )}
            {t.fondo && <Rect x={t.x - 4} y={t.y - 3} width={t.texto.length * 7 + 8} height={19} fill="#00000099" cornerRadius={3} />}
            <Text
              text={t.texto}
              x={t.x}
              y={t.y}
              fontSize={14}
              fontStyle="bold"
              fill={t.color}
              opacity={op(t)}
              draggable={puedeArrastrar(t)}
              onDragEnd={(e) => onMoverElemento?.('textos', t.id, e.target.x(), e.target.y())}
              onClick={click('textos', t)}
              onDblClick={() => onEditarTexto?.(t)}
              onDblTap={() => onEditarTexto?.(t)}
            />
          </Group>
        ))}
      </Layer>
    </Stage>
  )
}
