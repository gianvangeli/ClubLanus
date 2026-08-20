import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import { formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import NutricionTabs from '../components/NutricionTabs'
import './AdminJugadorDetalle.css'
import './JugadorNutricion.css'

const CAMPOS_BASICOS_EXTRA = [
  ['talla_sentado_cm', 'Talla sentado (cm)'],
  ['envergadura_cm', 'Envergadura (cm)'],
  ['altura_pie_cm', 'Altura en pie (cm)'],
]

const CAMPOS_DIAMETROS = [
  ['diametro_biacromial', 'Biacromial (cm)'],
  ['diametro_torax_transverso', 'Tórax transverso (cm)'],
  ['diametro_torax_anteroposterior', 'Tórax anteroposterior (cm)'],
  ['diametro_biiliocrestideo', 'Bi-iliocrestídeo (cm)'],
  ['diametro_humeral', 'Humeral, biepicondilar (cm)'],
  ['diametro_femoral', 'Femoral, biepicondilar (cm)'],
]

const CAMPOS_PERIMETROS = [
  ['perimetro_cabeza', 'Cabeza (cm)'],
  ['perimetro_brazo_relajado', 'Brazo relajado (cm)'],
  ['perimetro_brazo_flexionado', 'Brazo flexionado (cm)'],
  ['perimetro_antebrazo', 'Antebrazo, máxima (cm)'],
  ['perimetro_torax_mesoesternal', 'Tórax mesoesternal (cm)'],
  ['perimetro_cintura', 'Cintura, mínima (cm)'],
  ['perimetro_caderas', 'Caderas, máxima (cm)'],
  ['perimetro_muslo_superior', 'Muslo, superior (cm)'],
  ['perimetro_muslo_medial', 'Muslo, medial (cm)'],
  ['perimetro_pantorrilla', 'Pantorrilla, máxima (cm)'],
]

const CAMPOS_PLIEGUES = [
  ['pliegue_triceps', 'Tríceps (mm)'],
  ['pliegue_subescapular', 'Subescapular (mm)'],
  ['pliegue_supraespinal', 'Supraespinal (mm)'],
  ['pliegue_abdominal', 'Abdominal (mm)'],
  ['pliegue_muslo', 'Muslo, medio (mm)'],
  ['pliegue_pantorrilla', 'Pantorrilla (mm)'],
]

const CAMPOS_ANTROPOMETRIA_OPCIONALES = [...CAMPOS_BASICOS_EXTRA, ...CAMPOS_DIAMETROS, ...CAMPOS_PERIMETROS]

// Las masas corporales (masa muscular, adiposa, ósea, residual, de la piel)
// y el índice músculo-óseo salieron del alta manual: son resultados que se
// van a calcular en la app más adelante, no se cargan a mano por ahora. El
// historial ya cargado se sigue mostrando igual en la tabla de abajo.
const FORM_VACIO = {
  fecha: '',
  peso: '',
  talla: '',
  ...Object.fromEntries(CAMPOS_ANTROPOMETRIA_OPCIONALES.map(([campo]) => [campo, ''])),
  ...Object.fromEntries(CAMPOS_PLIEGUES.map(([campo]) => [campo, ''])),
  observaciones: '',
}

// Campos numéricos obligatorios del formulario, con la etiqueta a mostrar
// en el mensaje de error si faltan o no son un número válido.
const CAMPOS_NUMERICOS = [
  ['peso', 'El peso'],
  ['talla', 'La talla'],
  ...CAMPOS_PLIEGUES,
]

export default function JugadorNutricionEvaluaciones() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)

  useEffect(() => {
    api.get(`/jugadores/${id}`).then(({ data }) => setJugador(data))
  }, [id])

  const jugadorNombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : ''

  return (
    <div className="page">
      <Link to={`/admin/jugadores/${id}`} className="btn btn-ghost btn-sm">
        ← Volver a la ficha
      </Link>

      <div className="seccion-especializada-header">
        <h1>Nutrición del jugador{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="nutricion" />
      </div>

      <NutricionTabs jugadorId={id} activa="evaluaciones" />

      <Evaluaciones jugadorId={id} />
    </div>
  )
}

function Evaluaciones({ jugadorId }) {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [modoCarga, setModoCarga] = useState('manual')
  const [archivoPdf, setArchivoPdf] = useState(null)
  const [analizando, setAnalizando] = useState(false)

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/nutricion`)
      .then(({ data }) => setEvaluaciones(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const abrirForm = () => {
    setForm({ ...FORM_VACIO, fecha: new Date().toISOString().slice(0, 10) })
    setModoCarga('manual')
    setArchivoPdf(null)
    setError('')
    setMostrarForm(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const analizarPdf = async (e) => {
    e.preventDefault()
    setError('')

    if (!archivoPdf) {
      setError('Subí el PDF de la evaluación')
      return
    }

    setAnalizando(true)
    try {
      const datos = new FormData()
      datos.append('archivo', archivoPdf)
      const { data } = await api.post(`/jugadores/${jugadorId}/nutricion/importar-pdf`, datos)
      setForm((prev) => {
        const nuevo = { ...prev }
        Object.entries(data.campos).forEach(([campo, valor]) => {
          if (valor !== null && valor !== undefined && campo in nuevo) {
            nuevo[campo] = String(valor)
          }
        })
        return nuevo
      })
      setModoCarga('manual')
    } catch (err) {
      setError(extraerError(err, 'No se pudo analizar el PDF'))
    } finally {
      setAnalizando(false)
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.fecha) {
      setError('La fecha es obligatoria')
      return
    }

    const valores = {}
    for (const [campo, etiqueta] of CAMPOS_NUMERICOS) {
      const valor = aNumero(form[campo])
      if (!valor) {
        setError(`${etiqueta} es obligatoria y tiene que ser un número (podés usar coma o punto)`)
        return
      }
      valores[campo] = valor
    }

    const antropometria = {}
    for (const [campo] of CAMPOS_ANTROPOMETRIA_OPCIONALES) {
      antropometria[campo] = form[campo] ? aNumero(form[campo]) : null
    }

    setEnviando(true)
    try {
      await api.post(`/jugadores/${jugadorId}/nutricion`, {
        fecha: form.fecha,
        ...valores,
        ...antropometria,
        observaciones: form.observaciones,
      })
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar la evaluación'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card seccion nutricion-card">
      <div className="seccion-header">
        <h3>Evaluaciones nutricionales (carga semanal)</h3>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={abrirForm}>
            + Nueva evaluación
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarForm && (
        <>
          <div className="modo-toggle" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`btn btn-sm ${modoCarga === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setModoCarga('manual')}
            >
              Carga manual
            </button>
            <button
              type="button"
              className={`btn btn-sm ${modoCarga === 'pdf' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setModoCarga('pdf')}
            >
              Subir PDF
            </button>
          </div>

          {modoCarga === 'pdf' && (
            <form className="form-edicion" onSubmit={analizarPdf} style={{ marginBottom: 16 }}>
              <p className="texto-muted">
                Subí el PDF de la evaluación individual del jugador: la IA va a precargar los campos de abajo para
                que los revises y completes antes de guardar.
              </p>
              <div className="field">
                <label>PDF de la evaluación</label>
                <input type="file" accept="application/pdf" onChange={(e) => setArchivoPdf(e.target.files[0] || null)} />
              </div>
              <button className="btn btn-primary btn-sm" type="submit" disabled={analizando}>
                {analizando ? <span className="spinner" /> : 'Analizar con IA'}
              </button>
            </form>
          )}

          <form className="form-edicion form-nutricion" onSubmit={guardar}>
          <h4 className="nutri-form-seccion">Básicos</h4>
          <div className="form-nutricion-grid">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
            </div>
            <div className="field">
              <label>Peso (kg)</label>
              <input type="text" inputMode="decimal" value={form.peso} onChange={onChange('peso')} />
            </div>
            <div className="field">
              <label>Talla (cm)</label>
              <input type="text" inputMode="decimal" value={form.talla} onChange={onChange('talla')} />
            </div>
            {CAMPOS_BASICOS_EXTRA.map(([campo, etiqueta]) => (
              <div className="field" key={campo}>
                <label>{etiqueta}</label>
                <input type="text" inputMode="decimal" value={form[campo]} onChange={onChange(campo)} />
              </div>
            ))}
          </div>

          <h4 className="nutri-form-seccion">Diámetros</h4>
          <div className="form-nutricion-grid">
            {CAMPOS_DIAMETROS.map(([campo, etiqueta]) => (
              <div className="field" key={campo}>
                <label>{etiqueta}</label>
                <input type="text" inputMode="decimal" value={form[campo]} onChange={onChange(campo)} />
              </div>
            ))}
          </div>

          <h4 className="nutri-form-seccion">Perímetros</h4>
          <div className="form-nutricion-grid">
            {CAMPOS_PERIMETROS.map(([campo, etiqueta]) => (
              <div className="field" key={campo}>
                <label>{etiqueta}</label>
                <input type="text" inputMode="decimal" value={form[campo]} onChange={onChange(campo)} />
              </div>
            ))}
          </div>

          <h4 className="nutri-form-seccion">Pliegues cutáneos</h4>
          <div className="form-nutricion-grid">
            {CAMPOS_PLIEGUES.map(([campo, etiqueta]) => (
              <div className="field" key={campo}>
                <label>{etiqueta}</label>
                <input type="text" inputMode="decimal" value={form[campo]} onChange={onChange(campo)} />
              </div>
            ))}
          </div>

          <div className="field">
            <label>Observaciones</label>
            <input value={form.observaciones} onChange={onChange('observaciones')} />
          </div>

          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar evaluación'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </div>
          </form>
        </>
      )}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && evaluaciones.length === 0 && (
        <p className="texto-muted">Todavía no hay evaluaciones nutricionales cargadas para este jugador.</p>
      )}

      {!cargando && evaluaciones.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla tabla-compacta tabla-nutricion">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Edad dec.</th>
                <th>Peso</th>
                <th>Talla</th>
                <th>MM %</th>
                <th>MA %</th>
                <th>M. ósea %</th>
                <th>M. residual %</th>
                <th>M. piel %</th>
                <th>Sum 6p</th>
                <th>Índice M/O</th>
                <th>IMC</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map((e) => (
                <tr key={e.id}>
                  <td>{formatFecha(e.fecha)}</td>
                  <td>{e.edad_decimal ?? '—'}</td>
                  <td>{e.peso}</td>
                  <td>{e.talla}</td>
                  <td>{e.masa_muscular_pct != null ? `${e.masa_muscular_pct}%` : '—'}</td>
                  <td>{e.masa_adiposa_pct != null ? `${e.masa_adiposa_pct}%` : '—'}</td>
                  <td>{e.masa_osea_pct != null ? `${e.masa_osea_pct}%` : '—'}</td>
                  <td>{e.masa_residual_pct != null ? `${e.masa_residual_pct}%` : '—'}</td>
                  <td>{e.masa_piel_pct != null ? `${e.masa_piel_pct}%` : '—'}</td>
                  <td>{e.sumatoria_pliegues}</td>
                  <td>{e.indice_musculo_oseo ?? '—'}</td>
                  <td>{e.imc ?? '—'}</td>
                  <td className="texto-muted">{e.observaciones || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
