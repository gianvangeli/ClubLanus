import { useState } from 'react'
import CanchaEditor, { ESCENA_VACIA } from './CanchaEditor'
import './PlanPartidoEditor.css'

let idSeq = 1
const nuevoId = () => `cuadro-${Date.now()}-${idSeq++}`

const cuadroVacio = () => ({ id: nuevoId(), dibujo: ESCENA_VACIA, descripcion: '' })

// Plan de partido: una secuencia de cuadros (pizarra + leyenda) para
// describir un rival por fases (posicionamiento, salida, presión, ABP...).
// En modo editable se navega de a un cuadro con tabs; en modo solo lectura
// (vista del jugador) se listan todos verticalmente, uno debajo del otro.
export default function PlanPartidoEditor({ value, onChange, editable }) {
  const cuadros = value && value.length > 0 ? value : editable ? [cuadroVacio()] : []
  const [activo, setActivo] = useState(0)

  const actualizarCuadro = (indice, cambios) => {
    onChange(cuadros.map((c, i) => (i === indice ? { ...c, ...cambios } : c)))
  }

  const agregarCuadro = () => {
    const nuevos = [...cuadros, cuadroVacio()]
    onChange(nuevos)
    setActivo(nuevos.length - 1)
  }

  const eliminarCuadro = (indice) => {
    if (cuadros.length <= 1) return
    if (!window.confirm(`¿Eliminar el cuadro ${indice + 1}?`)) return
    const nuevos = cuadros.filter((_, i) => i !== indice)
    onChange(nuevos)
    setActivo((prev) => Math.min(prev, nuevos.length - 1))
  }

  const moverCuadro = (indice, direccion) => {
    const destino = indice + direccion
    if (destino < 0 || destino >= cuadros.length) return
    const nuevos = [...cuadros]
    ;[nuevos[indice], nuevos[destino]] = [nuevos[destino], nuevos[indice]]
    onChange(nuevos)
    setActivo(destino)
  }

  if (!editable) {
    if (cuadros.length === 0) return null
    return (
      <div className="plan-partido plan-partido-lectura">
        {cuadros.map((c, i) => (
          <div className="pp-cuadro-lectura" key={c.id || i}>
            <div className="pp-cuadro-lectura-header">
              <span className="pp-numero">{i + 1}</span>
            </div>
            <div className="pp-cuadro-lectura-cuerpo">
              <CanchaEditor value={c.dibujo} onChange={() => {}} editable={false} />
              {c.descripcion && <p className="pp-descripcion">{c.descripcion}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const cuadro = cuadros[activo] || cuadros[0]

  return (
    <div className="plan-partido">
      <div className="pp-tabs">
        {cuadros.map((c, i) => (
          <button
            key={c.id || i}
            type="button"
            className={`btn btn-sm pp-tab ${i === activo ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActivo(i)}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={agregarCuadro}>
          + Agregar cuadro
        </button>
      </div>

      <div className="pp-acciones-cuadro">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => moverCuadro(activo, -1)} disabled={activo === 0}>
          ◀ Mover
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => moverCuadro(activo, 1)} disabled={activo === cuadros.length - 1}>
          Mover ▶
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-danger"
          onClick={() => eliminarCuadro(activo)}
          disabled={cuadros.length <= 1}
        >
          Eliminar cuadro {activo + 1}
        </button>
      </div>

      <CanchaEditor value={cuadro.dibujo} onChange={(dibujo) => actualizarCuadro(activo, { dibujo })} editable />

      <div className="field pp-campo-descripcion">
        <label>Descripción / leyenda de este cuadro</label>
        <textarea
          rows={3}
          placeholder="Posicionamiento, esquema, salida de balón, presión, ABP..."
          value={cuadro.descripcion}
          onChange={(e) => actualizarCuadro(activo, { descripcion: e.target.value })}
        />
      </div>
    </div>
  )
}
