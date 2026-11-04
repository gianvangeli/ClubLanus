const FORMAS = [
  { valor: 'camiseta', etiqueta: 'Camiseta' },
  { valor: 'circulo', etiqueta: 'Círculo' },
]

// Popover de la herramienta "Jugador" (antes sección inline "Generic
// Player" del panel ancho): color de la ficha, forma (camiseta/círculo) y
// si muestra número.
export default function JugadorPopover({
  coloresJugador, colorJugador, onCambiarColorJugador,
  formaJugador, onCambiarFormaJugador,
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
        <span className="pizarra-popover-label">Forma</span>
        <div className="pizarra-popover-fila">
          {FORMAS.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={`btn btn-sm ${formaJugador === f.valor ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onCambiarFormaJugador(f.valor)}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <label className="mc-check">
        <input type="checkbox" checked={mostrarNumeroJugador} onChange={(e) => onCambiarMostrarNumeroJugador(e.target.checked)} /> Con número
      </label>
    </div>
  )
}
