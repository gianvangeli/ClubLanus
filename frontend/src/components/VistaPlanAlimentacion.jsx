import { formatFecha } from '../utils/fecha'
import './VistaPlanAlimentacion.css'

// Vista de solo lectura del plan de alimentación, compartida entre la
// página de gestión (cuerpo técnico) y la del jugador: mismo render para
// los dos, así lo que arma el nutricionista es exactamente lo que ve el
// jugador.
export default function VistaPlanAlimentacion({ dieta, archivoHref }) {
  if (!dieta || !dieta.modo) {
    return <p className="texto-muted">Todavía no hay un plan de alimentación cargado.</p>
  }

  return (
    <div>
      {dieta.actualizado_en && (
        <p className="texto-muted" style={{ marginBottom: 12 }}>
          Última actualización: {formatFecha(dieta.actualizado_en)}
        </p>
      )}

      {dieta.modo === 'archivo' ? (
        <a className="btn btn-primary btn-sm" href={archivoHref} target="_blank" rel="noreferrer">
          Ver plan de alimentación{dieta.archivo_nombre_original ? ` (${dieta.archivo_nombre_original})` : ''} ↗
        </a>
      ) : (
        <div className="pa-secciones">
          {(dieta.secciones || []).map((s) => (
            <div className="card pa-seccion" key={s.id}>
              <h4>{s.titulo}</h4>
              {s.imagen_url && <img src={s.imagen_url} alt={s.titulo} className="pa-imagen" />}
              {s.texto && <p className="pa-texto">{s.texto}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
