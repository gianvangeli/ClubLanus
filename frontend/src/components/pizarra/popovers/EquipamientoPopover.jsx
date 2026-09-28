import { Stage, Layer, Group } from 'react-konva'
import { EQUIPAMIENTO, renderFiguraEquipamiento } from '../equipamiento/iconos'

const TAMANO_PREVIEW = 34

// Vista previa real del ícono (el mismo dibujo Konva que se ve en la
// cancha), no una descripción en texto — así se elige mirando, no
// adivinando qué es "Arco (ángulo distinto)".
function VistaPreviaEquipo({ tipo, color }) {
  return (
    <Stage width={TAMANO_PREVIEW} height={TAMANO_PREVIEW} listening={false}>
      <Layer listening={false}>
        <Group x={TAMANO_PREVIEW / 2} y={TAMANO_PREVIEW / 2} scaleX={0.8} scaleY={0.8}>
          {renderFiguraEquipamiento(tipo, color, 0)}
        </Group>
      </Layer>
    </Stage>
  )
}

// Popover de la herramienta "Equipamiento": una grilla plana con la vista
// previa real de cada figura (sin categorías desplegables — con la
// miniatura ya se distingue todo a simple vista, no hacía falta agrupar),
// más el color y el tamaño de la próxima figura a colocar (o de la
// selección actual, si hay algo seleccionado — ver onCambiarEscalaFigura
// en PizarraTactica.jsx).
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

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Color de dibujo</span>
        <div className="mc-paleta">
          {paletaDibujo.map((c) => (
            <button key={c} type="button" className={`mc-swatch ${colorDibujo === c ? 'activo' : ''}`} style={{ background: c }} onClick={() => onCambiarColorDibujo(c)} />
          ))}
        </div>
      </div>

      <div className="pizarra-popover-seccion">
        <div className="pizarra-grilla-equipo">
          {EQUIPAMIENTO.map((eq) => (
            <button
              key={eq.valor}
              type="button"
              className={`pizarra-equipo-item ${figuraEquipamiento === eq.valor ? 'activo' : ''}`}
              title={eq.etiqueta + (eq.rotable ? ' (rotable)' : '')}
              onClick={() => {
                onCambiarFiguraEquipamiento(eq.valor)
                onElegirEquipamiento?.()
              }}
            >
              <VistaPreviaEquipo tipo={eq.valor} color={colorDibujo} />
              <span>{eq.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Tamaño</span>
        <p className="pizarra-popover-ayuda">Si hay figuras seleccionadas en la cancha, las redimensiona; si no, define el tamaño de la próxima que coloques.</p>
        <div className="pizarra-popover-fila">
          {escalasFigura.map((t) => (
            <button key={t.valor} type="button" className={`btn btn-sm ${escalaFigura === t.valor ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarEscalaFigura(t.valor)}>
              {t.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
