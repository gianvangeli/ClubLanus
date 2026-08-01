import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import './AdminObjetivosNutricionales.css'

const FORM_VACIO = {
  categoria: '',
  peso_min: '',
  peso_max: '',
  suma_6_pliegues_objetivo: '',
  indice_musculo_oseo_objetivo: '',
  imc_objetivo: '',
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
      peso_min: o.peso_min ?? '',
      peso_max: o.peso_max ?? '',
      suma_6_pliegues_objetivo: o.suma_6_pliegues_objetivo ?? '',
      indice_musculo_oseo_objetivo: o.indice_musculo_oseo_objetivo ?? '',
      imc_objetivo: o.imc_objetivo ?? '',
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
        peso_min: form.peso_min || null,
        peso_max: form.peso_max || null,
        suma_6_pliegues_objetivo: form.suma_6_pliegues_objetivo || null,
        indice_musculo_oseo_objetivo: form.indice_musculo_oseo_objetivo || null,
        imc_objetivo: form.imc_objetivo || null,
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
            <label>Peso mínimo (kg)</label>
            <input type="text" inputMode="decimal" value={form.peso_min} onChange={onChange('peso_min')} />
          </div>
          <div className="field">
            <label>Peso máximo (kg)</label>
            <input type="text" inputMode="decimal" value={form.peso_max} onChange={onChange('peso_max')} />
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
          <div className="field">
            <label>IMC de referencia</label>
            <input type="text" inputMode="decimal" value={form.imc_objetivo} onChange={onChange('imc_objetivo')} />
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
                <th>Peso</th>
                <th>Suma 6 pliegues</th>
                <th>Índice M.O.</th>
                <th>IMC ref.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {objetivos.map((o) => (
                <tr key={o.id}>
                  <td>{o.categoria}</td>
                  <td>{o.peso_min ?? '—'} a {o.peso_max ?? '—'} kg</td>
                  <td>Inferior a {o.suma_6_pliegues_objetivo ?? '—'} mm</td>
                  <td>≥ {o.indice_musculo_oseo_objetivo ?? '—'}</td>
                  <td>{o.imc_objetivo ?? '—'}</td>
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
    </div>
  )
}
