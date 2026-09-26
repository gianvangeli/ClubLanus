import { DEFINICIONES_GRID } from '../grillas/definicionesGrid'
import { COLORES_CAMPO } from '../CampoLienzo'

const OPCIONES_COLOR = [
  { valor: 'verde', etiqueta: 'Verde' },
  { valor: 'blanco', etiqueta: 'Blanco' },
  { valor: 'azul', etiqueta: 'Azul' },
  { valor: 'gris', etiqueta: 'Gris' },
]

const OPCIONES_PATRON = [
  { valor: 'ninguno', etiqueta: 'Ninguno' },
  { valor: 'rayas', etiqueta: 'Rayas' },
  { valor: 'cuadros', etiqueta: 'Cuadros' },
  { valor: 'diagonal', etiqueta: 'Diagonal' },
]

// Popover de "Cancha" (antes secciones inline "Cancha/color" + "Select
// Grid" del panel ancho): tipo y color de cancha, patrón de césped, líneas
// visibles, y esquema de grilla táctica superpuesta.
export default function CanchaPopover({ campo, onCambiarCampo, onCerrar }) {
  return (
    <div className="pizarra-popover" onMouseLeave={onCerrar}>
      <div className="pizarra-popover-titulo">Cancha</div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Tipo</span>
        <select value={campo.tipo} onChange={(e) => onCambiarCampo({ tipo: e.target.value })}>
          <option value="completa">Cancha entera</option>
          <option value="media">Mitad de cancha</option>
        </select>
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Color</span>
        <div className="mc-paleta">
          {OPCIONES_COLOR.map((c) => (
            <button
              key={c.valor}
              type="button"
              className={`mc-swatch ${campo.color === c.valor ? 'activo' : ''}`}
              style={{ background: COLORES_CAMPO[c.valor].fondo }}
              title={c.etiqueta}
              onClick={() => onCambiarCampo({ color: c.valor })}
            />
          ))}
        </div>
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Patrón de césped</span>
        <div className="pizarra-popover-fila">
          {OPCIONES_PATRON.map((p) => (
            <button
              key={p.valor}
              type="button"
              className={`btn btn-sm ${(campo.patronCesped || 'rayas') === p.valor ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onCambiarCampo({ patronCesped: p.valor })}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <label className="mc-check">
        <input type="checkbox" checked={campo.lineas} onChange={(e) => onCambiarCampo({ lineas: e.target.checked })} /> Líneas de cancha
      </label>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Grilla táctica</span>
        <select value={campo.grid || 'ninguno'} onChange={(e) => onCambiarCampo({ grid: e.target.value })}>
          <option value="ninguno">Sin esquema</option>
          {DEFINICIONES_GRID.map((g) => (
            <option key={g.valor} value={g.valor}>{g.etiqueta}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
