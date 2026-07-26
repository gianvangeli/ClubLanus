import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'
import './JugadorAnalisisFutbolistico.css'

const TIPOS_INFORME = [
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'trimestral', etiqueta: 'Trimestral' },
  { valor: 'anual', etiqueta: 'Anual' },
]

const etiquetaTipo = (valor) => TIPOS_INFORME.find((t) => t.valor === valor)?.etiqueta || valor

const FORM_VACIO = { fecha: '', tipo: 'mensual', informe: '', entrenamientos_recomendados: '' }

export default function JugadorAnalisisFutbolistico() {
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
        <h1>Análisis futbolístico{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="analisis-futbolistico" />
      </div>

      <ListaAnalisis jugadorId={id} />
    </div>
  )
}

function ListaAnalisis({ jugadorId }) {
  const [informes, setInformes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [video, setVideo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/analisis-futbolistico`)
      .then(({ data }) => setInformes(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const abrirForm = () => {
    setForm({ ...FORM_VACIO, fecha: new Date().toISOString().slice(0, 10) })
    setVideo(null)
    setError('')
    setMostrarForm(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.fecha || !form.informe.trim()) {
      setError('Fecha e informe son obligatorios')
      return
    }

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', form.fecha)
      datos.append('tipo', form.tipo)
      datos.append('informe', form.informe)
      if (form.entrenamientos_recomendados) {
        datos.append('entrenamientos_recomendados', form.entrenamientos_recomendados)
      }
      if (video) datos.append('video', video)
      await api.post(`/jugadores/${jugadorId}/analisis-futbolistico`, datos)
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar el informe'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (informe) => {
    if (!window.confirm(`¿Eliminar el informe ${etiquetaTipo(informe.tipo).toLowerCase()} del ${formatFecha(informe.fecha)}?`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${jugadorId}/analisis-futbolistico/${informe.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el informe'))
    }
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Informes técnicos y tácticos</h3>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={abrirForm}>
            + Nuevo informe
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarForm && (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="af-form-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={onChange('fecha')} required />
            </div>
            <div className="field">
              <label>Tipo de informe</label>
              <select value={form.tipo} onChange={onChange('tipo')}>
                {TIPOS_INFORME.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Informe</label>
            <textarea rows={5} value={form.informe} onChange={onChange('informe')} />
          </div>
          <div className="field">
            <label>Entrenamientos individuales recomendados (según debilidades detectadas)</label>
            <textarea
              rows={3}
              value={form.entrenamientos_recomendados}
              onChange={onChange('entrenamientos_recomendados')}
            />
          </div>
          <div className="field">
            <label>Video (opcional)</label>
            <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files[0] || null)} />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar informe'}
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

      {!cargando && informes.length === 0 && (
        <p className="texto-muted">Todavía no hay informes de análisis futbolístico cargados.</p>
      )}

      {!cargando && informes.length > 0 && (
        <div className="af-lista">
          {informes.map((i) => (
            <div key={i.id} className="af-item">
              <div className="af-item-header">
                <span className="badge badge-warning">{etiquetaTipo(i.tipo)}</span>
                <strong>{formatFecha(i.fecha)}</strong>
                <button className="btn btn-ghost btn-sm btn-danger" style={{ marginLeft: 'auto' }} onClick={() => eliminar(i)}>
                  Eliminar
                </button>
              </div>

              <div className="af-texto">
                <dt>Informe</dt>
                <dd>{i.informe}</dd>
              </div>

              {i.entrenamientos_recomendados && (
                <div className="af-texto">
                  <dt>Entrenamientos individuales recomendados</dt>
                  <dd>{i.entrenamientos_recomendados}</dd>
                </div>
              )}

              {i.nombre_video && (
                <video
                  className="video-player"
                  controls
                  preload="metadata"
                  src={`${API_BASE}/api/jugadores/${jugadorId}/analisis-futbolistico/${i.id}/video?token=${token}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
