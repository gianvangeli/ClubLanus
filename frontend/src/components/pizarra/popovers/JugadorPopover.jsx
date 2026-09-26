const PATRONES = [
  { valor: 'liso', etiqueta: 'Liso' },
  { valor: 'mitades', etiqueta: 'Mitades' },
  { valor: 'rayas', etiqueta: 'Rayas' },
  { valor: 'aros', etiqueta: 'Aros' },
]

const PALETA_SECUNDARIA = ['#ffffff', '#111827', '#eab308', '#f97316', '#0ea5e9', '#16a34a']

// Popover de la herramienta "Jugador" (antes sección inline "Generic
// Player" del panel ancho): color de la ficha, patrón de camiseta (liso/
// mitades/rayas/aros) + segundo color, y si muestra número.
export default function JugadorPopover({
  coloresJugador, colorJugador, onCambiarColorJugador,
  patronJugador, onCambiarPatronJugador,
  colorSecundarioJugador, onCambiarColorSecundarioJugador,
  mostrarNumeroJugador, onCambiarMostrarNumeroJugador,
  onElegirColor,
  onCerrar,
}) {
  return (
    <div className="pizarra-popover" onMouseLeave={onCerrar}>
      <div className="pizarra-popover-titulo">Jugador</div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Color</span>
        <div className="mc-grilla-jugadores">
          {coloresJugador.map((c) => (
            <button
              key={c}
              type="button"
              className={`mc-swatch-jugador ${colorJugador === c ? 'activo' : ''}`}
              style={{ background: c }}
              title="Agregar jugador — click en la cancha para colocarlo"
              onClick={() => {
                onCambiarColorJugador(c)
                onElegirColor?.()
              }}
            />
          ))}
        </div>
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Patrón de camiseta</span>
        <div className="pizarra-popover-fila">
          {PATRONES.map((p) => (
            <button
              key={p.valor}
              type="button"
              className={`btn btn-sm ${patronJugador === p.valor ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onCambiarPatronJugador(p.valor)}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {patronJugador !== 'liso' && (
        <div className="pizarra-popover-seccion">
          <span className="pizarra-popover-label">Segundo color</span>
          <div className="mc-paleta">
            {PALETA_SECUNDARIA.map((c) => (
              <button
                key={c}
                type="button"
                className={`mc-swatch ${colorSecundarioJugador === c ? 'activo' : ''}`}
                style={{ background: c }}
                onClick={() => onCambiarColorSecundarioJugador(c)}
              />
            ))}
          </div>
        </div>
      )}

      <label className="mc-check">
        <input type="checkbox" checked={mostrarNumeroJugador} onChange={(e) => onCambiarMostrarNumeroJugador(e.target.checked)} /> Con número
      </label>
    </div>
  )
}
