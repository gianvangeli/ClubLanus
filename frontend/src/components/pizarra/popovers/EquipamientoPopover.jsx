import { EQUIPAMIENTO, CATEGORIAS_EQUIPAMIENTO } from '../equipamiento/iconos'

// Popover de la herramienta "Equipamiento": elegir qué figura agregar
// (pelota, cono, arco, maniquí...), agrupadas en categorías expandibles
// (en vez de una única grilla plana), más el color de dibujo y el tamaño
// que usa la próxima figura que se coloque.
export default function EquipamientoPopover({
  figuraEquipamiento, onCambiarFiguraEquipamiento,
  colorDibujo, onCambiarColorDibujo, paletaDibujo,
  escalaFigura, onCambiarEscalaFigura, escalasFigura,
  onElegirEquipamiento,
  onCerrar,
}) {
  return (
    <div className="pizarra-popover" onMouseLeave={onCerrar}>
      <div className="pizarra-popover-titulo">Equipamiento</div>

      <div className="pizarra-popover-seccion pizarra-popover-categorias">
        {CATEGORIAS_EQUIPAMIENTO.map((categoria) => (
          <details key={categoria} open={EQUIPAMIENTO.some((e) => e.categoria === categoria && e.valor === figuraEquipamiento)}>
            <summary>{categoria}</summary>
            <div className="mc-grilla-equipamiento">
              {EQUIPAMIENTO.filter((e) => e.categoria === categoria).map((eq) => (
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
          </details>
        ))}
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Tamaño</span>
        <div className="pizarra-popover-fila">
          {escalasFigura.map((t) => (
            <button key={t.valor} type="button" className={`btn btn-sm ${escalaFigura === t.valor ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarEscalaFigura(t.valor)}>
              {t.etiqueta}
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
