import { useEffect, useRef, useState } from 'react'
import CampoLienzo, { ANCHO } from './CampoLienzo'
import ManualControl from './ManualControl'
import EscenasTimeline from './EscenasTimeline'
import AnimacionPanel from './AnimacionPanel'
import { normalizarEscenaV2, nuevaEscenaVaciaV2 } from './normalizarEscenaV2'
import { generarPatronRayas, puntosOndulados } from '../../utils/canchaGeometria'
import './PizarraTactica.css'

let idSeq = 1
const nuevoId = () => `el-${Date.now()}-${idSeq++}`

const COLORES_JUGADOR = [
  '#7a1230', '#1d4ed8', '#111827', '#f97316', '#0ea5e9',
  '#16a34a', '#eab308', '#db2777', '#8b5cf6', '#64748b',
]
const PALETA_DIBUJO = ['#7a1230', '#111827', '#1d4ed8', '#e11d48', '#16a34a', '#ffffff']
const TAMANOS = [
  { valor: 2, etiqueta: 'Chico' },
  { valor: 4, etiqueta: 'Mediano' },
  { valor: 7, etiqueta: 'Grande' },
]

const desplazarElemento = (el, dx, dy) =>
  el.points ? { ...el, points: el.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) } : { ...el, x: el.x + dx, y: el.y + dy }

/**
 * Pizarra táctica rediseñada: cancha (CampoLienzo) + Manual de Control
 * colapsable + timeline de escenas + generación de animación en video.
 * Reemplaza a CanchaEditor SOLO en EjercicioDetalle — PlanPartidoEditor y
 * EjerciciosTacticos siguen usando el CanchaEditor clásico sin cambios.
 *
 * `value`/`onChange` llevan el modelo v2 completo
 * ({version:2, campo, equipos, escenas}); el padre es responsable de
 * persistirlo tal cual en `dibujo_json`.
 */
export default function PizarraTactica({ value, onChange, editable = true, nombreArchivoExport, ejercicioId }) {
  const stageRef = useRef(null)
  const internalChangeRef = useRef(false)
  const cancelandoTextoRef = useRef(false)
  const canchaColRef = useRef(null)
  const [escala, setEscala] = useState(1)

  // La cancha se dibuja siempre a tamaño completo (ANCHO fijo) en un
  // sistema de coordenadas propio; acá solo se mide cuánto espacio real
  // hay disponible y se la achica para que entre COMPLETA sin recortarse
  // ni necesitar scroll (antes `overflow:hidden` del wrapper la recortaba
  // cuando el panel de Manual de Control no dejaba los 460px que necesita).
  useEffect(() => {
    const el = canchaColRef.current
    if (!el) return
    const medir = () => setEscala(Math.min(1, el.clientWidth / ANCHO))
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const modelo = normalizarEscenaV2(value)
  const [indiceEscena, setIndiceEscena] = useState(0)
  const escenaActivaIdx = Math.min(indiceEscena, modelo.escenas.length - 1)
  const escena = modelo.escenas[escenaActivaIdx]

  const [historial, setHistorial] = useState(() => [modelo])
  const [indiceHistorial, setIndiceHistorial] = useState(0)

  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }
    setHistorial([normalizarEscenaV2(value)])
    setIndiceHistorial(0)
    setSeleccionados([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const [panelColapsado, setPanelColapsado] = useState(false)
  const [panelAnimacionAbierto, setPanelAnimacionAbierto] = useState(false)
  const [herramienta, setHerramienta] = useState('seleccionar')
  const [seleccionados, setSeleccionados] = useState([])

  // Opciones activas de cada herramienta (equivalen a los popovers de
  // Línea/Formas + el color/número elegido en Generic Player/Equipamiento).
  const [colorDibujo, setColorDibujo] = useState(PALETA_DIBUJO[0])
  const [grosorDibujo, setGrosorDibujo] = useState(4)
  const [tipoLinea, setTipoLinea] = useState('flecha')
  const [curva, setCurva] = useState(false)
  const [estiloLinea, setEstiloLinea] = useState('solido')
  const [estructuraLinea, setEstructuraLinea] = useState('normal')
  const [formaZona, setFormaZona] = useState('rectangulo')
  const [punteadaZona, setPunteadaZona] = useState(false)
  const [patronRelleno, setPatronRelleno] = useState('ninguno')
  const [figuraEquipamiento, setFiguraEquipamiento] = useState('pelota')
  const [colorJugador, setColorJugador] = useState(COLORES_JUGADOR[0])
  const [mostrarNumeroJugador, setMostrarNumeroJugador] = useState(true)
  const [patronesListos, setPatronesListos] = useState({})

  const asegurarPatronRayas = (color) => {
    if (patronesListos[color]) return
    generarPatronRayas(color, (img) => setPatronesListos((prev) => (prev[color] ? prev : { ...prev, [color]: img })))
  }

  const [dibujando, setDibujando] = useState(null)
  const [dibujandoZona, setDibujandoZona] = useState(null)
  const [trazoActual, setTrazoActual] = useState(null)
  const [poligonoEnCurso, setPoligonoEnCurso] = useState(null)
  const [seleccionRect, setSeleccionRect] = useState(null)
  const [handleCurva, setHandleCurva] = useState(null)
  const [editorTexto, setEditorTexto] = useState(null)
  const [editorNumero, setEditorNumero] = useState(null)

  // Aplica cambios a la escena activa (no al modelo completo) y guarda un
  // snapshot del modelo entero en el historial de deshacer/rehacer — igual
  // patrón que el CanchaEditor clásico, ahora sobre {campo,equipos,escenas}.
  const actualizarEscena = (cambios) => {
    const nuevaEscena = { ...escena, ...cambios }
    const nuevoModelo = {
      ...modelo,
      escenas: modelo.escenas.map((e, i) => (i === escenaActivaIdx ? nuevaEscena : e)),
    }
    aplicarModelo(nuevoModelo)
  }

  const aplicarModelo = (nuevoModelo) => {
    internalChangeRef.current = true
    setHistorial((prev) => [...prev.slice(0, indiceHistorial + 1), nuevoModelo])
    setIndiceHistorial((i) => i + 1)
    onChange(nuevoModelo)
  }

  const actualizarCampo = (cambios) => aplicarModelo({ ...modelo, campo: { ...modelo.campo, ...cambios } })

  const puedeDeshacer = indiceHistorial > 0
  const puedeRehacer = indiceHistorial < historial.length - 1
  const deshacer = () => {
    if (!puedeDeshacer) return
    internalChangeRef.current = true
    setIndiceHistorial((i) => i - 1)
    onChange(historial[indiceHistorial - 1])
  }
  const rehacer = () => {
    if (!puedeRehacer) return
    internalChangeRef.current = true
    setIndiceHistorial((i) => i + 1)
    onChange(historial[indiceHistorial + 1])
  }

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y — se ignoran si el foco está en un
  // input/textarea O en un editor de texto enriquecido (contenteditable),
  // para no robarle el undo al Tiptap de "Entrenamientos Desglosados".
  useEffect(() => {
    if (!editable) return
    const onKeyDown = (e) => {
      const el = document.activeElement
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
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
  }, [editable, indiceHistorial, historial])

  useEffect(() => {
    if (!editable || herramienta !== 'seleccionar' || seleccionados.length === 0) return
    const onKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        eliminarSeleccion()
        return
      }
      const paso = e.shiftKey ? 20 : 5
      let dx = 0
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

  useEffect(() => {
    if (!editable || !poligonoEnCurso) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setPoligonoEnCurso(null)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        cerrarPoligono()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, poligonoEnCurso])

  const moverElemento = (lista, id, x, y) => actualizarEscena({ [lista]: escena[lista].map((el) => (el.id === id ? { ...el, x, y } : el)) })
  const rotarFigura = (id, rotacion) => actualizarEscena({ figuras: escena.figuras.map((f) => (f.id === id ? { ...f, rotacion } : f)) })
  const redimensionarZona = (id, cambios) => actualizarEscena({ zonas: escena.zonas.map((z) => (z.id === id ? { ...z, ...cambios } : z)) })
  const borrarElemento = (lista, id) => actualizarEscena({ [lista]: escena[lista].filter((el) => el.id !== id) })
  const toggleSeleccion = (lista, id) =>
    setSeleccionados((prev) =>
      prev.some((s) => s.lista === lista && s.id === id) ? prev.filter((s) => !(s.lista === lista && s.id === id)) : [...prev, { lista, id }]
    )

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
    actualizarEscena(cambios)
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
    actualizarEscena(cambios)
    setSeleccionados([])
  }

  const bloquearSeleccion = () => {
    if (seleccionados.length === 0) return
    const cambios = {}
    seleccionados.forEach(({ lista, id }) => {
      const base = cambios[lista] || escena[lista]
      cambios[lista] = base.map((el) => (el.id === id ? { ...el, bloqueado: !el.bloqueado } : el))
    })
    actualizarEscena(cambios)
  }

  const moverSeleccionEnBloque = (dx, dy) => {
    const cambios = {}
    seleccionados.forEach(({ lista, id }) => {
      const base = cambios[lista] || escena[lista]
      cambios[lista] = base.map((el) => (el.id === id && !el.bloqueado ? desplazarElemento(el, dx, dy) : el))
    })
    actualizarEscena(cambios)
  }

  const onClickElemento = (lista, elemento) => {
    if (herramienta === 'borrar') {
      if (elemento.bloqueado) return
      borrarElemento(lista, elemento.id)
    } else if (herramienta === 'candado') {
      actualizarEscena({ [lista]: escena[lista].map((el) => (el.id === elemento.id ? { ...el, bloqueado: !el.bloqueado } : el)) })
    } else if (herramienta === 'seleccionar') {
      toggleSeleccion(lista, elemento.id)
    }
  }

  const cerrarPoligono = () => {
    if (!poligonoEnCurso || poligonoEnCurso.puntos.length < 6) return
    actualizarEscena({
      zonas: [...escena.zonas, { id: nuevoId(), tipo: 'poligono', puntos: poligonoEnCurso.puntos, color: colorDibujo, grosor: grosorDibujo, punteada: punteadaZona, patronRelleno }],
    })
    setPoligonoEnCurso(null)
  }

  const posicionRelativa = (stage) => stage.getPointerPosition()

  const onStageMouseDown = (e) => {
    if (!editable) return
    const stage = e.target.getStage()
    const pos = posicionRelativa(stage)
    if (!pos) return
    const enVacio = e.target === stage || e.target.name?.() === 'fondo'

    if (herramienta === 'jugador') {
      const usados = escena.jugadores.map((j) => j.numero || 0)
      const numero = usados.length ? Math.max(...usados) + 1 : 1
      actualizarEscena({ jugadores: [...escena.jugadores, { id: nuevoId(), color: colorJugador, numero, mostrarNumero: mostrarNumeroJugador, x: pos.x, y: pos.y }] })
      return
    }
    if (herramienta === 'figura') {
      actualizarEscena({ figuras: [...escena.figuras, { id: nuevoId(), tipo: figuraEquipamiento, color: colorDibujo, x: pos.x, y: pos.y, rotacion: 0 }] })
      return
    }
    if (herramienta === 'texto') {
      cancelandoTextoRef.current = false
      setEditorTexto({ id: null, x: pos.x, y: pos.y, valor: '' })
      return
    }
    if (herramienta === 'linea') {
      const jugadorOrigen = escena.jugadores.find((j) => Math.hypot(j.x - pos.x, j.y - pos.y) < 16)
      const figuraOrigen = !jugadorOrigen && escena.figuras.find((f) => f.tipo === 'pelota' && Math.hypot(f.x - pos.x, f.y - pos.y) < 16)
      setDibujando({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, origenJugadorId: jugadorOrigen?.id || null, origenFiguraId: figuraOrigen?.id || null })
      return
    }
    if (herramienta === 'zona') {
      if (formaZona === 'poligono') {
        if (!poligonoEnCurso) setPoligonoEnCurso({ puntos: [pos.x, pos.y], cursor: null })
        else if (poligonoEnCurso.puntos.length >= 6 && Math.hypot(pos.x - poligonoEnCurso.puntos[0], pos.y - poligonoEnCurso.puntos[1]) < 10) cerrarPoligono()
        else setPoligonoEnCurso({ ...poligonoEnCurso, puntos: [...poligonoEnCurso.puntos, pos.x, pos.y] })
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

  const onStageMouseMove = (e) => {
    const stage = e.target.getStage()
    const pos = posicionRelativa(stage)
    if (!pos) return
    if (dibujando) setDibujando({ ...dibujando, x2: pos.x, y2: pos.y })
    if (dibujandoZona) {
      let x2 = pos.x
      let y2 = pos.y
      if (e.evt.shiftKey) {
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

  const onStageMouseUp = () => {
    if (dibujando) {
      const { x1, y1, x2, y2 } = dibujando
      if (Math.hypot(x2 - x1, y2 - y1) > 8) {
        let points = [x1, y1, x2, y2]
        if (tipoLinea === 'ondulada') points = puntosOndulados(x1, y1, x2, y2)
        else if (curva) {
          const midX = (x1 + x2) / 2
          const midY = (y1 + y2) / 2
          const dx = x2 - x1
          const dy = y2 - y1
          points = [x1, y1, midX - dy * 0.25, midY + dx * 0.25, x2, y2]
        }
        actualizarEscena({
          flechas: [
            ...escena.flechas,
            {
              id: nuevoId(), points, color: colorDibujo, estilo: estiloLinea,
              estructura: estructuraLinea,
              tension: tipoLinea === 'ondulada' ? 0.4 : curva ? 0.5 : 0,
              tipoLinea, grosor: grosorDibujo,
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
        actualizarEscena({
          zonas: [...escena.zonas, { id: nuevoId(), tipo: formaZona, x: Math.min(x1, x2), y: Math.min(y1, y2), width: ancho, height: altoZona, color: colorDibujo, grosor: grosorDibujo, punteada: punteadaZona, patronRelleno }],
        })
      }
      setDibujandoZona(null)
    }
    if (trazoActual) {
      if (trazoActual.length >= 4) actualizarEscena({ trazos: [...escena.trazos, { id: nuevoId(), points: trazoActual, color: colorDibujo, grosor: grosorDibujo }] })
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
      setSeleccionados((prev) => [...prev, ...nuevos.filter((n) => !prev.some((p) => p.lista === n.lista && p.id === n.id))])
      setSeleccionRect(null)
    }
  }

  const onArrastrarHandleCurva = (id, x, y, finalizar) => {
    if (!finalizar) {
      setHandleCurva({ id, x, y })
      return
    }
    actualizarEscena({ flechas: escena.flechas.map((f) => (f.id === id ? { ...f, points: [f.points[0], f.points[1], x, y, f.points[4], f.points[5]] } : f)) })
    setHandleCurva(null)
  }

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
      actualizarEscena({ textos: escena.textos.map((t) => (t.id === editorTexto.id ? { ...t, texto: valor } : t)) })
    } else {
      actualizarEscena({ textos: [...escena.textos, { id: nuevoId(), x: editorTexto.x, y: editorTexto.y, texto: valor, color: colorDibujo, fondo: false }] })
    }
    setEditorTexto(null)
  }
  const cancelarEditorTexto = () => {
    cancelandoTextoRef.current = true
    setEditorTexto(null)
  }
  const onEditarTexto = (t) => {
    if (!editable || t.bloqueado) return
    cancelandoTextoRef.current = false
    setEditorTexto({ id: t.id, x: t.x, y: t.y, valor: t.texto })
  }

  // Número editable de una ficha (spec 5.3) — doble click sobre el token
  // abre un inputcito numérico encima, igual patrón que el editor de texto.
  const confirmarEditorNumero = () => {
    if (!editorNumero) return
    const numero = Number(editorNumero.valor)
    if (Number.isFinite(numero)) {
      actualizarEscena({ jugadores: escena.jugadores.map((j) => (j.id === editorNumero.id ? { ...j, numero } : j)) })
    }
    setEditorNumero(null)
  }
  const onEditarNumero = (j) => {
    if (!editable || j.bloqueado) return
    setEditorNumero({ id: j.id, x: j.x, y: j.y, valor: String(j.numero ?? '') })
  }

  const vaciarCancha = () => {
    if (!window.confirm('¿Vaciar todo el dibujo de la escena actual?')) return
    actualizarEscena({ jugadores: [], flechas: [], figuras: [], textos: [], trazos: [], zonas: [] })
    setSeleccionados([])
  }

  const exportarImagen = () => {
    if (!stageRef.current) return
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = nombreArchivoExport || 'pizarra-tactica.png'
    link.href = uri
    link.click()
  }

  // --- Gestión de escenas (fotogramas clave de la animación) ---
  const crearEscenaDesdeActual = () => {
    const nueva = { ...nuevaEscenaVaciaV2(), nombre: `Escena ${modelo.escenas.length + 1}`, jugadores: escena.jugadores, figuras: escena.figuras, flechas: escena.flechas, textos: escena.textos, trazos: escena.trazos, zonas: escena.zonas }
    const escenas = [...modelo.escenas]
    escenas.splice(escenaActivaIdx + 1, 0, nueva)
    aplicarModelo({ ...modelo, escenas })
    setIndiceEscena(escenaActivaIdx + 1)
  }
  const duplicarEscena = (idx) => {
    const origen = modelo.escenas[idx]
    const copia = { ...origen, id: `escena-${Date.now()}-${idSeq++}`, nombre: `${origen.nombre} (copia)` }
    const escenas = [...modelo.escenas]
    escenas.splice(idx + 1, 0, copia)
    aplicarModelo({ ...modelo, escenas })
    setIndiceEscena(idx + 1)
  }
  const eliminarEscena = (idx) => {
    if (modelo.escenas.length <= 1) return
    if (!window.confirm('¿Eliminar esta escena?')) return
    const escenas = modelo.escenas.filter((_, i) => i !== idx)
    aplicarModelo({ ...modelo, escenas })
    setIndiceEscena((i) => Math.max(0, Math.min(i, escenas.length - 1)))
  }
  const reordenarEscena = (idx, dir) => {
    const destino = idx + dir
    if (destino < 0 || destino >= modelo.escenas.length) return
    const escenas = [...modelo.escenas]
    ;[escenas[idx], escenas[destino]] = [escenas[destino], escenas[idx]]
    aplicarModelo({ ...modelo, escenas })
    setIndiceEscena(destino)
  }
  const renombrarEscena = (idx, nombre) => {
    const escenas = modelo.escenas.map((e, i) => (i === idx ? { ...e, nombre } : e))
    aplicarModelo({ ...modelo, escenas })
  }
  const cambiarDuracionTransicion = (idx, ms) => {
    const escenas = modelo.escenas.map((e, i) => (i === idx ? { ...e, duracionTransicionMs: ms } : e))
    aplicarModelo({ ...modelo, escenas })
  }

  const dibujoEnCurso = dibujando
    ? { tipo: 'flecha', ...dibujando, color: colorDibujo, grosor: grosorDibujo, tipoLinea, estilo: estiloLinea }
    : dibujandoZona
    ? { tipo: 'zona', ...dibujandoZona, color: colorDibujo, grosor: grosorDibujo, punteada: punteadaZona }
    : poligonoEnCurso
    ? { tipo: 'poligono', ...poligonoEnCurso, color: colorDibujo, grosor: grosorDibujo }
    : trazoActual
    ? { tipo: 'trazo', points: trazoActual, color: colorDibujo, grosor: grosorDibujo }
    : null

  return (
    <div className={`pizarra-tactica ${panelColapsado ? 'panel-colapsado' : ''}`}>
      <div className="pizarra-cancha-col" ref={canchaColRef}>
        <div className="pizarra-stage-wrap">
          <CampoLienzo
            stageRef={stageRef}
            escena={escena}
            campo={modelo.campo}
            editable={editable}
            herramienta={herramienta}
            seleccionados={seleccionados}
            patronesListos={patronesListos}
            dibujoEnCurso={dibujoEnCurso}
            handleCurva={handleCurva}
            escala={escala}
            onStageMouseDown={onStageMouseDown}
            onStageMouseMove={onStageMouseMove}
            onStageMouseUp={onStageMouseUp}
            onStageDblClick={cerrarPoligono}
            onClickElemento={onClickElemento}
            onMoverElemento={moverElemento}
            onArrastrarHandleCurva={onArrastrarHandleCurva}
            onEditarTexto={onEditarTexto}
            onEditarNumero={onEditarNumero}
            onRotarFigura={rotarFigura}
            onRedimensionarZona={redimensionarZona}
          />
          {editorTexto && (
            <input
              className="pizarra-editor-texto"
              autoFocus
              style={{ left: editorTexto.x * escala, top: editorTexto.y * escala, fontSize: 14 * escala }}
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
          {editorNumero && (
            <input
              className="pizarra-editor-texto pizarra-editor-numero"
              type="number"
              autoFocus
              style={{ left: editorNumero.x * escala - 16 * escala, top: editorNumero.y * escala - 12 * escala, fontSize: 14 * escala }}
              value={editorNumero.valor}
              onChange={(e) => setEditorNumero({ ...editorNumero, valor: e.target.value })}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  confirmarEditorNumero()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setEditorNumero(null)
                }
              }}
              onBlur={confirmarEditorNumero}
            />
          )}
        </div>
        <EscenasTimeline
          escenas={modelo.escenas}
          indiceActivo={escenaActivaIdx}
          onIrAEscena={setIndiceEscena}
          onCrear={crearEscenaDesdeActual}
          onDuplicar={duplicarEscena}
          onEliminar={eliminarEscena}
          onReordenar={reordenarEscena}
          onRenombrar={renombrarEscena}
          onCambiarDuracion={cambiarDuracionTransicion}
          onAbrirAnimacion={() => setPanelAnimacionAbierto(true)}
        />
      </div>

      {!panelColapsado && (
        <ManualControl
          campo={modelo.campo}
          equipos={modelo.equipos}
          herramienta={herramienta}
          onCambiarHerramienta={setHerramienta}
          onColapsar={() => setPanelColapsado(true)}
          onCambiarCampo={actualizarCampo}
          colorJugador={colorJugador}
          onCambiarColorJugador={setColorJugador}
          mostrarNumeroJugador={mostrarNumeroJugador}
          onCambiarMostrarNumeroJugador={setMostrarNumeroJugador}
          coloresJugador={COLORES_JUGADOR}
          figuraEquipamiento={figuraEquipamiento}
          onCambiarFiguraEquipamiento={setFiguraEquipamiento}
          colorDibujo={colorDibujo}
          onCambiarColorDibujo={setColorDibujo}
          paletaDibujo={PALETA_DIBUJO}
          grosorDibujo={grosorDibujo}
          onCambiarGrosorDibujo={setGrosorDibujo}
          tamanos={TAMANOS}
          tipoLinea={tipoLinea}
          onCambiarTipoLinea={setTipoLinea}
          curva={curva}
          onCambiarCurva={setCurva}
          estiloLinea={estiloLinea}
          onCambiarEstiloLinea={setEstiloLinea}
          estructuraLinea={estructuraLinea}
          onCambiarEstructuraLinea={setEstructuraLinea}
          formaZona={formaZona}
          onCambiarFormaZona={setFormaZona}
          punteadaZona={punteadaZona}
          onCambiarPunteadaZona={setPunteadaZona}
          patronRelleno={patronRelleno}
          onCambiarPatronRelleno={(p) => {
            setPatronRelleno(p)
            if (p === 'rayas') asegurarPatronRayas(colorDibujo)
          }}
          puedeDeshacer={puedeDeshacer}
          puedeRehacer={puedeRehacer}
          onDeshacer={deshacer}
          onRehacer={rehacer}
          onExportarImagen={exportarImagen}
          onVaciarCancha={vaciarCancha}
          seleccionActiva={seleccionados.length > 0}
          onEliminarSeleccion={eliminarSeleccion}
          onDuplicarSeleccion={duplicarSeleccion}
          onBloquearSeleccion={bloquearSeleccion}
          onAbrirAnimacion={() => setPanelAnimacionAbierto(true)}
        />
      )}
      {panelColapsado && (
        <button type="button" className="pizarra-reabrir-panel btn btn-ghost btn-sm" onClick={() => setPanelColapsado(false)}>
          ☰ Manual de Control
        </button>
      )}

      {panelAnimacionAbierto && (
        <AnimacionPanel
          escenas={modelo.escenas}
          campo={modelo.campo}
          onCerrar={() => setPanelAnimacionAbierto(false)}
          onCambiarDuracion={cambiarDuracionTransicion}
          ejercicioId={ejercicioId}
        />
      )}
    </div>
  )
}
