import './EscenasTimeline.css'

/**
 * Línea de tiempo de escenas (fotogramas clave) debajo de la cancha:
 * crear/duplicar/eliminar/reordenar/ir-a, sin límite de cantidad. Es la
 * base del sistema de animación por escenas (sección 6 de la spec) — las
 * flechas/dibujos nunca se interpretan como movimiento, la animación sale
 * únicamente de esta secuencia.
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
            {i > 0 && (
              <label className="escena-duracion" title="Duración de la transición desde la escena anterior">
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
      {escenas.length > 1 && (
        <button type="button" className="btn btn-primary btn-sm escenas-convertir" onClick={onAbrirAnimacion}>
          ▶ Editar animación
        </button>
      )}
    </div>
  )
}
