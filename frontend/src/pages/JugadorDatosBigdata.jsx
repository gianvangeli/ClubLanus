import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'
import './JugadorDatosBigdata.css'

const FORM_VACIO = { fecha: '', partido: '', informe: '' }

export default function JugadorDatosBigdata() {
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
        <h1>Datos (Big Data){jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="datos" />
      </div>

      <ListaDatos jugadorId={id} />
    </div>
  )
}

function ListaDatos({ jugadorId }) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [archivo, setArchivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/datos-bigdata`)
      .then(({ data }) => setDatos(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const abrirForm = () => {
    setForm({ ...FORM_VACIO, fecha: new Date().toISOString().slice(0, 10) })
    setArchivo(null)
    setError('')
    setMostrarForm(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.fecha || !form.partido.trim()) {
      setError('Fecha y partido son obligatorios')
      return
    }

    setEnviando(true)
    try {
      const datosForm = new FormData()
      datosForm.append('fecha', form.fecha)
      datosForm.append('partido', form.partido)
      if (form.informe) datosForm.append('informe', form.informe)
      if (archivo) datosForm.append('archivo', archivo)
      await api.post(`/jugadores/${jugadorId}/datos-bigdata`, datosForm)
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudieron importar los datos'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (dato) => {
    if (!window.confirm(`¿Eliminar el registro del ${formatFecha(dato.fecha)} (${dato.partido})?`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${jugadorId}/datos-bigdata/${dato.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el registro'))
    }
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Datos estadísticos</h3>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={abrirForm}>
            + Importar datos
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarForm && (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="bd-form-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
            </div>
            <div className="field">
              <label>Partido</label>
              <input value={form.partido} onChange={onChange('partido')} placeholder="Ej: Fecha 18 vs Boca" required />
            </div>
          </div>
          <div className="field">
            <label>Importar datos (CSV, Excel, JSON o PDF)</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json,.pdf"
              onChange={(e) => setArchivo(e.target.files[0] || null)}
            />
          </div>
          <div className="field">
            <label>Informe</label>
            <textarea rows={4} value={form.informe} onChange={onChange('informe')} />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar'}
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

      {!cargando && datos.length === 0 && (
        <p className="texto-muted">Todavía no hay datos importados para este jugador.</p>
      )}

      {!cargando && datos.length > 0 && (
        <div className="bd-lista">
          {datos.map((d) => (
            <div key={d.id} className="bd-item">
              <div className="bd-item-header">
                <strong>{d.partido}</strong>
                <span className="texto-muted">{formatFecha(d.fecha)}</span>
              </div>

              {d.informe && (
                <div className="bd-texto">
                  <dt>Informe</dt>
                  <dd>{d.informe}</dd>
                </div>
              )}

              <div className="bd-item-acciones">
                {d.nombre_archivo && (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`${API_BASE}/api/jugadores/${jugadorId}/datos-bigdata/${d.id}/archivo?token=${token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {d.nombre_archivo} ↗
                  </a>
                )}
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(d)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
