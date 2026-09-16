import { EQUIPAMIENTO } from '../equipamiento/iconos'

// Popover de la herramienta "Equipamiento" (antes sección inline "Add
// Equipment" del panel ancho): elegir qué figura agregar (pelota, cono,
// arco, maniquí...) y el color de dibujo que usan línea/zona/texto/lápiz.
export default function EquipamientoPopover({
  figuraEquipamiento, onCambiarFiguraEquipamiento,
  colorDibujo, onCambiarColorDibujo, paletaDibujo,
  onElegirEquipamiento,
  onCerrar,
}) {
  return (
    <div className="pizarra-popover" onMouseLeave={onCerrar}>
      <div className="pizarra-popover-titulo">Equipamiento</div>

      <div className="pizarra-popover-seccion">
        <div className="mc-grilla-equipamiento">
          {EQUIPAMIENTO.map((eq) => (
            <button
              key={eq.valor}
              type="button"
              className={`btn btn-sm mc-icono-equipo ${figuraEquipamiento === eq.valor ? 'btn-primary' : 'btn-ghost'}`}
              title={eq.etiqueta + (eq.rotable ? ' (rotable)' : '')}
              onClick={() => {
                onCambiarFiguraEquipamiento(eq.valor)
                onElegirEquipamiento?.()
              }}
            >
              {eq.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Color de dibujo</span>
        <div className="mc-paleta">
          {paletaDibujo.map((c) => (
            <button key={c} type="button" className={`mc-swatch ${colorDibujo === c ? 'activo' : ''}`} style={{ background: c }} onClick={() => onCambiarColorDibujo(c)} />
          ))}
        </div>
      </div>
    </div>
  )
}
