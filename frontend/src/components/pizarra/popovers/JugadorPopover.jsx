// Popover de la herramienta "Jugador" (antes sección inline "Generic
// Player" del panel ancho): elegir color de la ficha + si muestra número.
export default function JugadorPopover({
  coloresJugador, colorJugador, onCambiarColorJugador,
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

      <label className="mc-check">
        <input type="checkbox" checked={mostrarNumeroJugador} onChange={(e) => onCambiarMostrarNumeroJugador(e.target.checked)} /> Con número
      </label>
    </div>
  )
}
