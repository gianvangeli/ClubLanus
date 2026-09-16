import { useState } from 'react'
import {
  MousePointer2, Move, UserRound, ArrowUpRight, Shapes, Package2, Type, Pencil,
  Lock, LockKeyhole, Eraser, LayoutGrid, Undo2, Redo2, ImagePlus, Download,
  Trash2, FolderOpen, Save, Copy, Clapperboard, ChevronsLeft, ArrowLeftRight,
} from 'lucide-react'
import LineaPopover from './popovers/LineaPopover'
import FormaPopover from './popovers/FormaPopover'
import JugadorPopover from './popovers/JugadorPopover'
import EquipamientoPopover from './popovers/EquipamientoPopover'
import CanchaPopover from './popovers/CanchaPopover'
import './ManualControl.css'

// Herramientas principales de la barra, en orden. `popover` (si tiene)
// indica qué caja flotante abrir al seleccionarla — mismo mecanismo que ya
// existía para Línea/Formas, ahora extendido a Jugador/Equipamiento.
const HERRAMIENTAS = [
  { valor: 'seleccionar', Icono: MousePointer2, titulo: 'Seleccionar' },
  { valor: 'mover', Icono: Move, titulo: 'Mover' },
  { valor: 'jugador', Icono: UserRound, titulo: 'Jugador', popover: 'jugador' },
  { valor: 'linea', Icono: ArrowUpRight, titulo: 'Línea', popover: 'linea' },
  { valor: 'zona', Icono: Shapes, titulo: 'Formas', popover: 'forma' },
  { valor: 'figura', Icono: Package2, titulo: 'Equipamiento', popover: 'equipamiento' },
  { valor: 'texto', Icono: Type, titulo: 'Texto' },
  { valor: 'lapiz', Icono: Pencil, titulo: 'Lápiz' },
  { valor: 'candado', Icono: Lock, titulo: 'Candado' },
  { valor: 'borrar', Icono: Eraser, titulo: 'Borrar' },
]

const POPOVER_POR_HERRAMIENTA = HERRAMIENTAS.reduce((acc, h) => {
  if (h.popover) acc[h.valor] = h.popover
  return acc
}, {})

/**
 * "Manual de Control" de la pizarra: barra vertical angosta de solo
 * íconos (herramientas arriba, acciones abajo). Todo lo que no entra en un
 * ícono (colores, selects, opciones combinables) vive en un popover
 * flotante anclado al ícono correspondiente — mismo patrón ya probado con
 * Línea/Formas, ahora también para Jugador/Equipamiento/Cancha.
 */
export default function ManualControl(props) {
  const {
    campo, herramienta, onCambiarHerramienta, onColapsar, onCambiarCampo,
    colorJugador, onCambiarColorJugador, mostrarNumeroJugador, onCambiarMostrarNumeroJugador, coloresJugador,
    figuraEquipamiento, onCambiarFiguraEquipamiento,
    colorDibujo, onCambiarColorDibujo, paletaDibujo,
    grosorDibujo, onCambiarGrosorDibujo, tamanos,
    tipoLinea, onCambiarTipoLinea, curva, onCambiarCurva, estiloLinea, onCambiarEstiloLinea,
    estructuraLinea, onCambiarEstructuraLinea,
    formaZona, onCambiarFormaZona, punteadaZona, onCambiarPunteadaZona, patronRelleno, onCambiarPatronRelleno,
    puedeDeshacer, puedeRehacer, onDeshacer, onRehacer, onExportarImagen, onVaciarCancha,
    seleccionActiva, onEliminarSeleccion, onDuplicarSeleccion, onBloquearSeleccion,
    onAbrirAnimacion, onAbrirJugadas,
    panelLado, onCambiarLado, onSubirImagen, onGuardar,
  } = props

  const [popoverAbierto, setPopoverAbierto] = useState(null)

  const elegirHerramienta = (h) => {
    onCambiarHerramienta(h)
    setPopoverAbierto(POPOVER_POR_HERRAMIENTA[h] || null)
  }

  const toggleCancha = () => setPopoverAbierto((p) => (p === 'cancha' ? null : 'cancha'))
  const cerrarPopover = () => setPopoverAbierto(null)

  return (
    <aside className="manual-control">
      <div className="mc-grupo">
        <button type="button" className="mc-icono" title="Colapsar panel" onClick={onColapsar}>
          <ChevronsLeft size={18} />
        </button>
        <button
          type="button"
          className="mc-icono"
          title={panelLado === 'izquierda' ? 'Mover panel a la derecha' : 'Mover panel a la izquierda'}
          onClick={onCambiarLado}
        >
          <ArrowLeftRight size={18} />
        </button>
      </div>

      <div className="mc-grupo">
        {HERRAMIENTAS.map(({ valor, Icono, titulo, popover }) => (
          <div key={valor} className="mc-icono-anchor">
            <button
              type="button"
              className={`mc-icono ${herramienta === valor ? 'activo' : ''}`}
              title={titulo}
              onClick={() => elegirHerramienta(valor)}
            >
              <Icono size={18} />
            </button>
            {popover === 'jugador' && popoverAbierto === 'jugador' && (
              <JugadorPopover
                coloresJugador={coloresJugador}
                colorJugador={colorJugador}
                onCambiarColorJugador={onCambiarColorJugador}
                mostrarNumeroJugador={mostrarNumeroJugador}
                onCambiarMostrarNumeroJugador={onCambiarMostrarNumeroJugador}
                onCerrar={cerrarPopover}
              />
            )}
            {popover === 'linea' && popoverAbierto === 'linea' && (
              <LineaPopover
                tipoLinea={tipoLinea} onCambiarTipoLinea={onCambiarTipoLinea}
                curva={curva} onCambiarCurva={onCambiarCurva}
                estiloLinea={estiloLinea} onCambiarEstiloLinea={onCambiarEstiloLinea}
                estructuraLinea={estructuraLinea} onCambiarEstructuraLinea={onCambiarEstructuraLinea}
                grosorDibujo={grosorDibujo} onCambiarGrosorDibujo={onCambiarGrosorDibujo}
                tamanos={tamanos}
                onCerrar={cerrarPopover}
              />
            )}
            {popover === 'forma' && popoverAbierto === 'forma' && (
              <FormaPopover
                formaZona={formaZona} onCambiarFormaZona={onCambiarFormaZona}
                punteadaZona={punteadaZona} onCambiarPunteadaZona={onCambiarPunteadaZona}
                patronRelleno={patronRelleno} onCambiarPatronRelleno={onCambiarPatronRelleno}
                grosorDibujo={grosorDibujo} onCambiarGrosorDibujo={onCambiarGrosorDibujo}
                tamanos={tamanos}
                onCerrar={cerrarPopover}
              />
            )}
            {popover === 'equipamiento' && popoverAbierto === 'equipamiento' && (
              <EquipamientoPopover
                figuraEquipamiento={figuraEquipamiento}
                onCambiarFiguraEquipamiento={onCambiarFiguraEquipamiento}
                colorDibujo={colorDibujo}
                onCambiarColorDibujo={onCambiarColorDibujo}
                paletaDibujo={paletaDibujo}
                onCerrar={cerrarPopover}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mc-grupo">
        <div className="mc-icono-anchor">
          <button type="button" className={`mc-icono ${popoverAbierto === 'cancha' ? 'activo' : ''}`} title="Cancha" onClick={toggleCancha}>
            <LayoutGrid size={18} />
          </button>
          {popoverAbierto === 'cancha' && <CanchaPopover campo={campo} onCambiarCampo={onCambiarCampo} onCerrar={cerrarPopover} />}
        </div>
      </div>

      {seleccionActiva && (
        <div className="mc-grupo">
          <button type="button" className="mc-icono" title="Duplicar" onClick={onDuplicarSeleccion}>
            <Copy size={18} />
          </button>
          <button type="button" className="mc-icono" title="Bloquear/Desbloquear" onClick={onBloquearSeleccion}>
            <LockKeyhole size={18} />
          </button>
          <button type="button" className="mc-icono mc-icono-peligro" title="Eliminar" onClick={onEliminarSeleccion}>
            <Trash2 size={18} />
          </button>
        </div>
      )}

      <div className="mc-grupo mc-grupo-separado">
        <button type="button" className="mc-icono" title="Deshacer" onClick={onDeshacer} disabled={!puedeDeshacer}>
          <Undo2 size={18} />
        </button>
        <button type="button" className="mc-icono" title="Rehacer" onClick={onRehacer} disabled={!puedeRehacer}>
          <Redo2 size={18} />
        </button>
        <label className="mc-icono" title="Subir imagen de referencia">
          <ImagePlus size={18} />
          <input type="file" accept="image/*" onChange={onSubirImagen} hidden />
        </label>
        <button type="button" className="mc-icono" title="Exportar imagen" onClick={onExportarImagen}>
          <Download size={18} />
        </button>
        <button type="button" className="mc-icono" title="Vaciar cancha" onClick={onVaciarCancha}>
          <Trash2 size={18} />
        </button>
        <button type="button" className="mc-icono" title="Jugadas guardadas" onClick={onAbrirJugadas}>
          <FolderOpen size={18} />
        </button>
      </div>

      <div className="mc-grupo mc-pie">
        <button type="button" className="mc-icono" title="Editar animación" onClick={onAbrirAnimacion}>
          <Clapperboard size={18} />
        </button>
        {onGuardar && (
          <button type="button" className="mc-icono mc-icono-destacado" title="Guardar" onClick={onGuardar}>
            <Save size={18} />
          </button>
        )}
      </div>
    </aside>
  )
}
