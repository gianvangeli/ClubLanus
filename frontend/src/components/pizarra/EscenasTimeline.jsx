import { tieneMovimientoAutomatico } from './interpolarEscenas'
import './EscenasTimeline.css'

/**
 * Línea de tiempo de escenas (fotogramas clave) debajo de la cancha:
 * crear/duplicar/eliminar/reordenar/ir-a, sin límite de cantidad. Es la
 * base del sistema de animación por escenas (sección 6 de la spec) —con
 * 2+ escenas, las flechas/dibujos nunca se interpretan como movimiento, la
 * animación sale de la secuencia. La única excepción es una escena única
 * con flechas que salen de un jugador/pelota (ver interpolarEscenas.js):
 * ahí la animación sale de esas flechas, sin necesidad de armar una
 * segunda escena — por eso el input de duración y el botón de abajo
 * también aparecen en ese caso.
 */
export default function EscenasTimeline({
  escenas, indiceActivo, onIrAEscena, onCrear, onDuplicar, onEliminar, onReordenar, onRenombrar, onCambiarDuracion, onAbrirAnimacion,
}) {
  return (
    <div className="escenas-timeline">
      <div className="escenas-lista">
        {escenas.map((e, i) => (
          <div key={e.id} className={`escena-chip ${i === indiceActivo ? 'activa' : ''}`}>
            <button type="button" className="escena-chip-btn" onClick={() => onIrAEscena(i)}>
              <span className="escena-numero">{i + 1}</span>
              <input
                className="escena-nombre"
                value={e.nombre}
                onChange={(ev) => onRenombrar(i, ev.target.value)}
                onClick={(ev) => ev.stopPropagation()}
              />
            </button>
            <div className="escena-chip-acciones">
              <button type="button" title="Mover antes" onClick={() => onReordenar(i, -1)} disabled={i === 0}>◀</button>
              <button type="button" title="Duplicar" onClick={() => onDuplicar(i)}>⧉</button>
              <button type="button" title="Mover después" onClick={() => onReordenar(i, 1)} disabled={i === escenas.length - 1}>▶</button>
              <button type="button" title="Eliminar" onClick={() => onEliminar(i)} disabled={escenas.length <= 1}>✕</button>
            </div>
            {(i > 0 || (escenas.length === 1 && tieneMovimientoAutomatico(e))) && (
              <label
                className="escena-duracion"
                title={i > 0 ? 'Duración de la transición desde la escena anterior' : 'Duración del movimiento automático (flechas desde un jugador/pelota)'}
              >
                <input
                  type="number"
                  min={200}
                  step={100}
                  value={e.duracionTransicionMs}
                  onChange={(ev) => onCambiarDuracion(i, Math.max(200, Number(ev.target.value) || 0))}
                />
                ms
              </label>
            )}
          </div>
        ))}
        <button type="button" className="escena-agregar" onClick={onCrear} title="Crear escena nueva a partir del estado actual">
          + Escena
        </button>
      </div>
      {(escenas.length > 1 || tieneMovimientoAutomatico(escenas[0])) && (
        <button type="button" className="btn btn-primary btn-sm escenas-convertir" onClick={onAbrirAnimacion}>
          ▶ Editar animación
        </button>
      )}
    </div>
  )
}
