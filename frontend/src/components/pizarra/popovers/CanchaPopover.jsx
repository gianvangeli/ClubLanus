import { DEFINICIONES_GRID } from '../grillas/definicionesGrid'

// Popover de "Cancha" (antes secciones inline "Cancha/color" + "Select
// Grid" del panel ancho): tipo y color de cancha, líneas visibles, y
// esquema de grilla táctica superpuesta.
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
        <select value={campo.color} onChange={(e) => onCambiarCampo({ color: e.target.value })}>
          <option value="blanco">Blanco</option>
          <option value="verde">Verde</option>
        </select>
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
