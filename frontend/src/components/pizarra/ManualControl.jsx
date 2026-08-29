import { useState } from 'react'
import { EQUIPAMIENTO } from './equipamiento/iconos'
import { DEFINICIONES_GRID } from './grillas/definicionesGrid'
import LineaPopover from './popovers/LineaPopover'
import FormaPopover from './popovers/FormaPopover'
import './ManualControl.css'

/**
 * Panel derecho de la pizarra ("Manual de Control"), de arriba hacia
 * abajo: barra de acciones, Select Grid, Generic Player, Add Equipment,
 * Add Object (con popovers de Línea/Formas), y el botón fijo "Editar
 * animación" al pie — espejo de la sección 5 de la spec.
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

  const [popoverAbierto, setPopoverAbierto] = useState(null) // 'linea' | 'forma' | null

  const elegirHerramienta = (h) => {
    onCambiarHerramienta(h)
    setPopoverAbierto(h === 'linea' || h === 'zona' ? (h === 'linea' ? 'linea' : 'forma') : null)
  }

  return (
    <aside className="manual-control">
      {/* 5.1 — Barra superior de acciones */}
      <div className="mc-barra-acciones">
        <button type="button" className="btn btn-ghost btn-icon" title="Colapsar panel" onClick={onColapsar}>⏵</button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          title={panelLado === 'izquierda' ? 'Mover panel a la derecha' : 'Mover panel a la izquierda'}
          onClick={onCambiarLado}
        >
          ⇄
        </button>
        <button type="button" className="btn btn-ghost btn-icon" title="Deshacer" onClick={onDeshacer} disabled={!puedeDeshacer}>↺</button>
        <button type="button" className="btn btn-ghost btn-icon" title="Rehacer" onClick={onRehacer} disabled={!puedeRehacer}>↻</button>
        <label className="btn btn-ghost btn-icon" title="Subir imagen de referencia">
          🖼
          <input type="file" accept="image/*" onChange={onSubirImagen} hidden />
        </label>
        <button type="button" className="btn btn-ghost btn-icon" title="Exportar imagen" onClick={onExportarImagen}>⬇</button>
        <button type="button" className="btn btn-ghost btn-icon" title="Vaciar cancha" onClick={onVaciarCancha}>🗑</button>
        <button type="button" className="btn btn-ghost btn-icon" title="Jugadas guardadas" onClick={onAbrirJugadas}>📂</button>
        {onGuardar && (
          <button type="button" className="btn btn-primary btn-icon" title="Guardar" onClick={onGuardar}>💾</button>
        )}
      </div>

      {seleccionActiva && (
        <div className="mc-barra-seleccion">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onDuplicarSeleccion}>Duplicar</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onBloquearSeleccion}>Bloquear/Desbloquear</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onEliminarSeleccion}>Eliminar</button>
        </div>
      )}

      {/* Cancha/color + Select Grid: una fila horizontal por concepto, sin
          partir el panel en columnas angostas (con selects nativos, dos
          columnas de menos de 200px hacía que el texto de las opciones
          desbordara su caja y se superpusiera con la de al lado). */}
      <div className="mc-seccion">
        <div className="mc-fila-campo">
          <select value={campo.tipo} onChange={(e) => onCambiarCampo({ tipo: e.target.value })}>
            <option value="completa">Cancha entera</option>
            <option value="media">Mitad de cancha</option>
          </select>
          <select value={campo.color} onChange={(e) => onCambiarCampo({ color: e.target.value })}>
            <option value="blanco">Blanco</option>
            <option value="verde">Verde</option>
          </select>
        </div>
        <label className="mc-check">
          <input type="checkbox" checked={campo.lineas} onChange={(e) => onCambiarCampo({ lineas: e.target.checked })} /> Líneas de cancha
        </label>
      </div>

      {/* 5.2 — Select Grid */}
      <div className="mc-seccion">
        <div className="mc-fila-campo">
          <span className="mc-titulo-seccion mc-titulo-inline">SELECT GRID</span>
          <select value={campo.grid || 'ninguno'} onChange={(e) => onCambiarCampo({ grid: e.target.value })}>
            <option value="ninguno">Sin esquema</option>
            {DEFINICIONES_GRID.map((g) => (
              <option key={g.valor} value={g.valor}>{g.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5.3 — Generic Player */}
      <div className="mc-seccion">
        <div className="mc-titulo-fila">
          <span className="mc-titulo-seccion">GENERIC PLAYER</span>
          <label className="mc-check mc-check-chico">
            <input type="checkbox" checked={mostrarNumeroJugador} onChange={(e) => onCambiarMostrarNumeroJugador(e.target.checked)} /> Con número
          </label>
        </div>
        <div className="mc-grilla-jugadores">
          {coloresJugador.map((c) => (
            <button
              key={c}
              type="button"
              className={`mc-swatch-jugador ${herramienta === 'jugador' && colorJugador === c ? 'activo' : ''}`}
              style={{ background: c }}
              title="Agregar jugador — click en la cancha para colocarlo"
              onClick={() => {
                onCambiarColorJugador(c)
                elegirHerramienta('jugador')
              }}
            />
          ))}
        </div>
      </div>

      {/* 5.4 — Add Equipment */}
      <div className="mc-seccion">
        <span className="mc-titulo-seccion">ADD EQUIPMENT</span>
        <div className="mc-grilla-equipamiento">
          {EQUIPAMIENTO.map((eq) => (
            <button
              key={eq.valor}
              type="button"
              className={`btn btn-sm mc-icono-equipo ${herramienta === 'figura' && figuraEquipamiento === eq.valor ? 'btn-primary' : 'btn-ghost'}`}
              title={eq.etiqueta + (eq.rotable ? ' (rotable)' : '')}
              onClick={() => {
                onCambiarFiguraEquipamiento(eq.valor)
                elegirHerramienta('figura')
              }}
            >
              {eq.etiqueta}
            </button>
          ))}
        </div>
        <div className="mc-paleta">
          {paletaDibujo.map((c) => (
            <button key={c} type="button" className={`mc-swatch ${colorDibujo === c ? 'activo' : ''}`} style={{ background: c }} onClick={() => onCambiarColorDibujo(c)} />
          ))}
        </div>
      </div>

      {/* 5.5 — Add Object: Texto, Líneas (popover), Formas (popover) */}
      <div className="mc-seccion">
        <span className="mc-titulo-seccion">ADD OBJECT</span>
        <div className="mc-fila-object">
          <button type="button" className={`btn btn-sm ${herramienta === 'texto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('texto')}>
            Tt Texto
          </button>
          <div className="mc-object-popover-anchor">
            <button type="button" className={`btn btn-sm ${herramienta === 'linea' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('linea')}>
              ↗ Línea
            </button>
            {popoverAbierto === 'linea' && (
              <LineaPopover
                tipoLinea={tipoLinea} onCambiarTipoLinea={onCambiarTipoLinea}
                curva={curva} onCambiarCurva={onCambiarCurva}
                estiloLinea={estiloLinea} onCambiarEstiloLinea={onCambiarEstiloLinea}
                estructuraLinea={estructuraLinea} onCambiarEstructuraLinea={onCambiarEstructuraLinea}
                grosorDibujo={grosorDibujo} onCambiarGrosorDibujo={onCambiarGrosorDibujo}
                tamanos={tamanos}
                onCerrar={() => setPopoverAbierto(null)}
              />
            )}
          </div>
          <div className="mc-object-popover-anchor">
            <button type="button" className={`btn btn-sm ${herramienta === 'zona' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('zona')}>
              ▢ Formas
            </button>
            {popoverAbierto === 'forma' && (
              <FormaPopover
                formaZona={formaZona} onCambiarFormaZona={onCambiarFormaZona}
                punteadaZona={punteadaZona} onCambiarPunteadaZona={onCambiarPunteadaZona}
                patronRelleno={patronRelleno} onCambiarPatronRelleno={onCambiarPatronRelleno}
                grosorDibujo={grosorDibujo} onCambiarGrosorDibujo={onCambiarGrosorDibujo}
                tamanos={tamanos}
                onCerrar={() => setPopoverAbierto(null)}
              />
            )}
          </div>
          <button type="button" className={`btn btn-sm ${herramienta === 'lapiz' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('lapiz')}>
            ✎ Lápiz
          </button>
        </div>
        <div className="mc-fila-object" style={{ marginTop: 6 }}>
          <button type="button" className={`btn btn-sm ${herramienta === 'seleccionar' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('seleccionar')}>Seleccionar</button>
          <button type="button" className={`btn btn-sm ${herramienta === 'mover' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('mover')}>Mover</button>
          <button type="button" className={`btn btn-sm ${herramienta === 'candado' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('candado')}>Candado</button>
          <button type="button" className={`btn btn-sm ${herramienta === 'borrar' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => elegirHerramienta('borrar')}>Borrar</button>
        </div>
      </div>

      <button type="button" className="btn btn-primary mc-boton-animacion" onClick={onAbrirAnimacion}>
        Editar animación
      </button>
    </aside>
  )
}
