// Popover de la herramienta "Línea": todas las opciones son combinables
// entre sí (Forma, Tamaño, Estilo de trazo, Estructura), como pide la spec
// (sección 5.5). Se abre al tocar el ícono de línea en "Add Object".
export default function LineaPopover({
  tipoLinea, onCambiarTipoLinea,
  curva, onCambiarCurva,
  estiloLinea, onCambiarEstiloLinea,
  estructuraLinea, onCambiarEstructuraLinea,
  grosorDibujo, onCambiarGrosorDibujo,
  tamanos,
  onCerrar,
}) {
  return (
    <div className="pizarra-popover" onMouseLeave={onCerrar}>
      <div className="pizarra-popover-titulo">Línea</div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Forma</span>
        <div className="pizarra-popover-fila">
          <button type="button" className={`btn btn-sm ${!curva ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarCurva(false)} disabled={tipoLinea === 'ondulada'}>
            Recta
          </button>
          <button type="button" className={`btn btn-sm ${curva ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarCurva(true)} disabled={tipoLinea === 'ondulada'}>
            Curva
          </button>
        </div>
        {curva && <p className="pizarra-popover-ayuda">Arrastrá el punto azul sobre la línea para curvarla.</p>}
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Tamaño</span>
        <div className="pizarra-popover-fila">
          {tamanos.map((t) => (
            <button key={t.valor} type="button" className={`btn btn-sm ${grosorDibujo === t.valor ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarGrosorDibujo(t.valor)}>
              {t.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Estilo de trazo</span>
        <select value={tipoLinea === 'ondulada' ? 'ondulada' : estiloLinea} onChange={(e) => {
          const v = e.target.value
          if (v === 'ondulada') { onCambiarTipoLinea('ondulada'); return }
          if (tipoLinea === 'ondulada') onCambiarTipoLinea('flecha')
          onCambiarEstiloLinea(v)
        }}>
          <option value="solido">Sólida</option>
          <option value="punteada">Punteada</option>
          <option value="discontinua">Discontinua</option>
          <option value="ondulada">Ondulada (drible)</option>
        </select>
        <div className="pizarra-popover-fila" style={{ marginTop: 6 }}>
          <button type="button" className={`btn btn-sm ${tipoLinea === 'flecha' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarTipoLinea('flecha')}>Flecha</button>
          <button type="button" className={`btn btn-sm ${tipoLinea === 'flecha-doble' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarTipoLinea('flecha-doble')}>Flecha doble</button>
          <button type="button" className={`btn btn-sm ${tipoLinea === 'linea' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarTipoLinea('linea')}>Sin punta</button>
          <button type="button" className={`btn btn-sm ${tipoLinea === 'bloqueo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarTipoLinea('bloqueo')}>Bloqueo</button>
        </div>
      </div>

      <div className="pizarra-popover-seccion">
        <span className="pizarra-popover-label">Estructura</span>
        <div className="pizarra-popover-fila">
          <button type="button" className={`btn btn-sm ${estructuraLinea === 'normal' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarEstructuraLinea('normal')}>Normal</button>
          <button type="button" className={`btn btn-sm ${estructuraLinea === 'puntada' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onCambiarEstructuraLinea('puntada')}>Puntada</button>
        </div>
      </div>
    </div>
  )
}
