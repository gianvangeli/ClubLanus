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

      {campo.tipo === 'completa' && (
        <div className="pizarra-popover-seccion">
          <span className="pizarra-popover-label">Orientación</span>
          <div className="pizarra-popover-fila">
            <button
              type="button"
              className={`btn btn-sm ${(campo.orientacion || 'vertical') === 'vertical' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onCambiarCampo({ orientacion: 'vertical' })}
            >
              Parada
            </button>
            <button
              type="button"
              className={`btn btn-sm ${campo.orientacion === 'horizontal' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onCambiarCampo({ orientacion: 'horizontal' })}
            >
              Acostada
            </button>
          </div>
        </div>
      )}

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
        <div className="pizarra-popover-grid-grillas">
          <button
            type="button"
            className={`pizarra-grilla-miniatura ${!campo.grid || campo.grid === 'ninguno' ? 'activo' : ''}`}
            title="Sin esquema"
            onClick={() => onCambiarCampo({ grid: 'ninguno' })}
          >
            <MiniaturaGrid tipo="ninguno" />
            <span>Ninguno</span>
          </button>
          {DEFINICIONES_GRID.map((g) => (
            <button
              key={g.valor}
              type="button"
              className={`pizarra-grilla-miniatura ${campo.grid === g.valor ? 'activo' : ''}`}
              title={g.etiqueta}
              onClick={() => onCambiarCampo({ grid: g.valor })}
            >
              <MiniaturaGrid tipo={g.valor} />
              <span>{g.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Miniatura SVG esquemática de cada esquema de grilla — un dibujo simple
// (no un render Konva real) para no montar Stages extra dentro del popover.
function MiniaturaGrid({ tipo }) {
  const w = 40
  const h = 56
  const linea = { stroke: '#7a1230', strokeWidth: 1.5, strokeDasharray: '3 3' }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="pizarra-grilla-svg">
      <rect x={1} y={1} width={w - 2} height={h - 2} fill="none" stroke="#c9c0c3" strokeWidth={1} />
      {tipo === 'posicional' && (
        <>
          {[1, 2, 3, 4].map((i) => <line key={i} x1={(w / 5) * i} y1={2} x2={(w / 5) * i} y2={h - 2} {...linea} />)}
          {[1, 2].map((i) => <line key={i} x1={2} y1={(h / 3) * i} x2={w - 2} y2={(h / 3) * i} {...linea} />)}
        </>
      )}
      {tipo === 'tercios' && [1, 2].map((i) => <line key={i} x1={2} y1={(h / 3) * i} x2={w - 2} y2={(h / 3) * i} {...linea} />)}
      {tipo === 'carriles' && [1, 2, 3, 4].map((i) => <line key={i} x1={(w / 5) * i} y1={2} x2={(w / 5) * i} y2={h - 2} {...linea} />)}
      {tipo === 'zona_central' && <rect x={2} y={h / 3} width={w - 4} height={h / 3} fill="none" {...linea} />}
    </svg>
  )
}
