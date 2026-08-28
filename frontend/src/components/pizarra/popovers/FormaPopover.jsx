// Popover de la herramienta "Formas": Cuadrado/Rombo/Hexágono/Círculo,
// cada una con tamaño (arrastrando en la cancha), borde recto/punteado y
// relleno (sin relleno / liso / con textura-rayas).
const FORMAS = [
  { valor: 'rectangulo', etiqueta: 'Cuadrado' },
  { valor: 'rombo', etiqueta: 'Rombo' },
  { valor: 'hexagono', etiqueta: 'Hexágono' },
  { valor: 'ovalo', etiqueta: 'Círculo' },
  { valor: 'poligono', etiqueta: 'Forma libre' },
]

export default function FormaPopover({
  formaZona, onCambiarFormaZona,
  punteadaZona, onCambiarPunteadaZona,
  patronRelleno, onCambiarPatronRelleno,
  grosorDibujo, onCambiarGrosorDibujo,
  tamanos,
  poligonoEnCurso,
  onCerrar,
}) {
  return (
    <div className="pizarra-popover" onMouseLeave={onCerrar}>
      <div className="pizarra-popover-titulo">Formas</div>

      <div className="pizarra-popover-seccion">
        <div className="pizarra-popover-grid-formas">
          {FORMAS.map((f) => (
            <button key={f.valor} type="button" className={`btn btn-sm ${formaZona === f.valor ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarFormaZona(f.valor)}>
              {f.etiqueta}
            </button>
          ))}
        </div>
        {formaZona === 'poligono' && (
          <p className="pizarra-popover-ayuda">
            {poligonoEnCurso ? 'Click para agregar vértices · doble-click o Enter para cerrar · Esc para cancelar' : 'Click en la cancha para empezar a marcar el contorno.'}
          </p>
        )}
      </div>

      {formaZona !== 'poligono' && (
        <>
          <div className="pizarra-popover-seccion">
            <span className="pizarra-popover-label">Tamaño (arrastrá para dibujar)</span>
            <div className="pizarra-popover-fila">
              {tamanos.map((t) => (
                <button key={t.valor} type="button" className={`btn btn-sm ${grosorDibujo === t.valor ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarGrosorDibujo(t.valor)}>
                  {t.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="pizarra-popover-seccion">
            <span className="pizarra-popover-label">Borde</span>
            <div className="pizarra-popover-fila">
              <button type="button" className={`btn btn-sm ${!punteadaZona ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarPunteadaZona(false)}>Recto</button>
              <button type="button" className={`btn btn-sm ${punteadaZona ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarPunteadaZona(true)}>Punteado</button>
            </div>
          </div>

          <div className="pizarra-popover-seccion">
            <span className="pizarra-popover-label">Relleno</span>
            <div className="pizarra-popover-fila">
              <button type="button" className={`btn btn-sm ${patronRelleno === 'ninguno' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarPatronRelleno('ninguno')}>Sin relleno</button>
              <button type="button" className={`btn btn-sm ${patronRelleno === 'liso' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarPatronRelleno('liso')}>Liso</button>
              <button type="button" className={`btn btn-sm ${patronRelleno === 'rayas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarPatronRelleno('rayas')}>Con textura</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
