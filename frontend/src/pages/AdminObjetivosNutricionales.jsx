import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { ZONAS_INDICE_MO, ZONAS_SUMA_6PL, colorDeZona } from '../utils/nutricionZonas'
import './AdminObjetivosNutricionales.css'

const PERIODOS = [
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'quincena', etiqueta: 'Quincena' },
  { valor: 'mes', etiqueta: 'Mes' },
]

const FORM_VACIO = {
  categoria: '',
  suma_6_pliegues_objetivo: '',
  indice_musculo_oseo_objetivo: '',
}

export default function AdminObjetivosNutricionales() {
  const [objetivos, setObjetivos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get('/objetivos-nutricionales')
      .then(({ data }) => setObjetivos(data))
      .catch((err) => setError(extraerError(err, 'No se pudieron cargar los objetivos')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const editar = (o) => {
    setEditandoId(o.id)
    setForm({
      categoria: o.categoria,
      suma_6_pliegues_objetivo: o.suma_6_pliegues_objetivo ?? '',
      indice_musculo_oseo_objetivo: o.indice_musculo_oseo_objetivo ?? '',
    })
    setMensaje('')
    setError('')
  }

  const cancelar = () => {
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    if (!form.categoria.trim()) {
      setError('La categoría es obligatoria')
      return
    }

    setGuardando(true)
    try {
      await api.put('/objetivos-nutricionales', {
        categoria: form.categoria,
        suma_6_pliegues_objetivo: form.suma_6_pliegues_objetivo || null,
        indice_musculo_oseo_objetivo: form.indice_musculo_oseo_objetivo || null,
      })
      setMensaje('Objetivos guardados correctamente')
      cancelar()
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudieron guardar los objetivos'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (o) => {
    if (!window.confirm(`¿Eliminar los objetivos de la categoría "${o.categoria}"?`)) return
    try {
      await api.delete(`/objetivos-nutricionales/${o.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar'))
    }
  }

  return (
    <div className="page">
      <Link to="/admin/jugadores" className="btn btn-ghost btn-sm">
        ← Volver a jugadores
      </Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>Objetivos nutricionales por categoría</h1>
          <p>Se muestran como referencia en el informe nutricional de cada jugador, según su categoría.</p>
        </div>
      </div>

      <form className="card objn-form" onSubmit={guardar}>
        <h3>{editandoId ? 'Editar objetivos' : 'Nueva categoría'}</h3>

        {error && <div className="alert alert-error">{error}</div>}
        {mensaje && <div className="alert alert-success">{mensaje}</div>}

        <div className="objn-form-grid">
          <div className="field">
            <label>Categoría</label>
            <input value={form.categoria} onChange={onChange('categoria')} disabled={Boolean(editandoId)} required />
          </div>
          <div className="field">
            <label>Suma de 6 pliegues objetivo (mm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.suma_6_pliegues_objetivo}
              onChange={onChange('suma_6_pliegues_objetivo')}
            />
          </div>
          <div className="field">
            <label>Índice músculo-óseo objetivo</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.indice_musculo_oseo_objetivo}
              onChange={onChange('indice_musculo_oseo_objetivo')}
            />
          </div>
        </div>

        <div className="form-edicion-botones">
          <button className="btn btn-primary btn-sm" type="submit" disabled={guardando}>
            {guardando ? <span className="spinner" /> : 'Guardar'}
          </button>
          {editandoId && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && objetivos.length === 0 && (
        <div className="empty-state card">
          <p>Todavía no hay categorías con objetivos configurados.</p>
        </div>
      )}

      {!cargando && objetivos.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla tabla-compacta">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Suma 6 pliegues</th>
                <th>Índice M.O.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {objetivos.map((o) => (
                <tr key={o.id}>
                  <td>{o.categoria}</td>
                  <td>Inferior a {o.suma_6_pliegues_objetivo ?? '—'} mm</td>
                  <td>≥ {o.indice_musculo_oseo_objetivo ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => editar(o)}>Editar</button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(o)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && objetivos.length > 0 && <ReporteGrupal categorias={objetivos.map((o) => o.categoria)} />}
    </div>
  )
}

function ReporteGrupal({ categorias }) {
  const [categoria, setCategoria] = useState(categorias[0] || '')
  const [periodo, setPeriodo] = useState('mes')
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!categoria) return
    setCargando(true)
    setError('')
    api
      .get('/objetivos-nutricionales/reporte-grupal', { params: { categoria, periodo } })
      .then(({ data }) => setReporte(data))
      .catch((err) => setError(extraerError(err, 'No se pudo generar el reporte')))
      .finally(() => setCargando(false))
  }, [categoria, periodo])

  return (
    <div className="card seccion" style={{ marginTop: 24 }}>
      <div className="seccion-header">
        <h3>Reporte grupal</h3>
      </div>
      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Se arma solo a partir de las evaluaciones ya cargadas de cada jugador de la categoría — no hace falta subir
        nada acá.
      </p>

      <div className="objn-reporte-filtros">
        <div className="field">
          <label>Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Agrupar por</label>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando && (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {!cargando && reporte && reporte.jugadores.length === 0 && (
        <p className="texto-muted">No hay jugadores en esta categoría.</p>
      )}

      {!cargando && reporte && reporte.jugadores.length > 0 && reporte.periodos.length === 0 && (
        <p className="texto-muted">Todavía no hay evaluaciones cargadas para esta categoría.</p>
      )}

      {!cargando && reporte && reporte.periodos.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla tabla-compacta">
            <thead>
              <tr>
                <th>Jugador</th>
                {reporte.periodos.map((p) => (
                  <th key={p.clave} colSpan={3} style={{ textAlign: 'center' }}>{p.etiqueta}</th>
                ))}
              </tr>
              <tr>
                <th></th>
                {reporte.periodos.map((p) => (
                  <Fragment key={p.clave}>
                    <th>Peso</th>
                    <th>Σ6pl</th>
                    <th>IMO</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {reporte.jugadores.map((j) => (
                <tr key={j.id}>
                  <td>{j.apellido}, {j.nombre}</td>
                  {reporte.periodos.map((p) => {
                    const v = j.valores[p.clave]
                    const colorS6p = colorDeZona(ZONAS_SUMA_6PL, v?.sumatoria_pliegues)
                    const colorImo = colorDeZona(ZONAS_INDICE_MO, v?.indice_musculo_oseo)
                    return (
                      <Fragment key={p.clave}>
                        <td>{v?.peso ?? '—'}</td>
                        <td style={colorS6p ? { background: `${colorS6p}33` } : undefined}>
                          {v?.sumatoria_pliegues ?? '—'}
                        </td>
                        <td style={colorImo ? { background: `${colorImo}33` } : undefined}>
                          {v?.indice_musculo_oseo ?? '—'}
                        </td>
                      </Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
