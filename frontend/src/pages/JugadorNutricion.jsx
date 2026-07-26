import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import { formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'
import './JugadorNutricion.css'

const FORM_VACIO = {
  fecha: '',
  peso: '',
  talla: '',
  masa_muscular_kg: '',
  masa_adiposa_kg: '',
  sumatoria_pliegues: '',
  masa_osea: '',
  indice_musculo_oseo: '',
  observaciones: '',
}

// Campos numéricos obligatorios del formulario, con la etiqueta a mostrar
// en el mensaje de error si faltan o no son un número válido.
const CAMPOS_NUMERICOS = [
  ['peso', 'El peso'],
  ['talla', 'La talla'],
  ['masa_muscular_kg', 'La masa muscular'],
  ['masa_adiposa_kg', 'La masa adiposa'],
  ['sumatoria_pliegues', 'La sumatoria de 6 pliegues'],
  ['masa_osea', 'La masa ósea'],
  ['indice_musculo_oseo', 'El índice músculo-óseo'],
]

export default function JugadorNutricion() {
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

      <NutricionJugador jugadorId={id} />
    </div>
  )
}

function NutricionJugador({ jugadorId }) {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

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
    setError('')
    setMostrarForm(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

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

    setEnviando(true)
    try {
      await api.post(`/jugadores/${jugadorId}/nutricion`, {
        fecha: form.fecha,
        ...valores,
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
        <h3>Evaluaciones nutricionales</h3>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={abrirForm}>
            + Nueva evaluación
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarForm && (
        <form className="form-edicion form-nutricion" onSubmit={guardar}>
          <div className="form-nutricion-grid">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
            </div>
            <div className="field">
              <label>Peso (kg)</label>
              <input type="text" inputMode="decimal" placeholder="Ej: 64,00" value={form.peso} onChange={onChange('peso')} />
            </div>
            <div className="field">
              <label>Talla (cm)</label>
              <input type="text" inputMode="decimal" placeholder="Ej: 168,00" value={form.talla} onChange={onChange('talla')} />
            </div>
            <div className="field">
              <label>Masa muscular (kg)</label>
              <input type="text" inputMode="decimal" value={form.masa_muscular_kg} onChange={onChange('masa_muscular_kg')} />
            </div>
            <div className="field">
              <label>Masa adiposa (kg)</label>
              <input type="text" inputMode="decimal" value={form.masa_adiposa_kg} onChange={onChange('masa_adiposa_kg')} />
            </div>
            <div className="field">
              <label>Sumatoria de 6 pliegues</label>
              <input type="text" inputMode="decimal" value={form.sumatoria_pliegues} onChange={onChange('sumatoria_pliegues')} />
            </div>
            <div className="field">
              <label>Masa ósea</label>
              <input type="text" inputMode="decimal" value={form.masa_osea} onChange={onChange('masa_osea')} />
            </div>
            <div className="field">
              <label>Índice músculo-óseo</label>
              <input type="text" inputMode="decimal" value={form.indice_musculo_oseo} onChange={onChange('indice_musculo_oseo')} />
            </div>
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
                <th>MM (kg)</th>
                <th>MM (%)</th>
                <th>MA (kg)</th>
                <th>MA (%)</th>
                <th>Sum 6p</th>
                <th>M. ósea</th>
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
                  <td>{e.masa_muscular_kg}</td>
                  <td>{e.masa_muscular_pct != null ? `${e.masa_muscular_pct}%` : '—'}</td>
                  <td>{e.masa_adiposa_kg}</td>
                  <td>{e.masa_adiposa_pct != null ? `${e.masa_adiposa_pct}%` : '—'}</td>
                  <td>{e.sumatoria_pliegues}</td>
                  <td>{e.masa_osea}</td>
                  <td>{e.indice_musculo_oseo}</td>
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
