import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import EscudoClub from '../components/EscudoClub'
import CanchaEditor, { ESCENA_VACIA } from '../components/CanchaEditor'
import './EjercicioDetalle.css'

const CAMPOS_VACIOS = {
  dia: '',
  sesion_numero: '',
  turno: '',
  tipo_trabajo: '',
  espacio: '',
  materiales: '',
  objetivo: '',
  n_jugadores: '',
  duracion: '',
  descripcion: '',
  puntuacion: '',
  entrenador_a_cargo: '',
  jugadores: '',
  pechera: '',
}

export default function EjercicioDetalle() {
  const { id, ejercicioId } = useParams()
  const navigate = useNavigate()
  const [ejercicio, setEjercicio] = useState(null)
  const [form, setForm] = useState(CAMPOS_VACIOS)
  const [dibujo, setDibujo] = useState(ESCENA_VACIA)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/ejercicios/${ejercicioId}`)
      .then(({ data }) => {
        setEjercicio(data)
        setForm({
          dia: data.dia ? String(data.dia).slice(0, 10) : '',
          sesion_numero: data.sesion_numero || '',
          turno: data.turno || '',
          tipo_trabajo: data.tipo_trabajo || '',
          espacio: data.espacio || '',
          materiales: data.materiales || '',
          objetivo: data.objetivo || '',
          n_jugadores: data.n_jugadores || '',
          duracion: data.duracion || '',
          descripcion: data.descripcion || '',
          puntuacion: data.puntuacion || '',
          entrenador_a_cargo: data.entrenador_a_cargo || '',
          jugadores: data.jugadores || '',
          pechera: data.pechera || '',
        })
        setDibujo(data.dibujo_json || ESCENA_VACIA)
      })
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el ejercicio')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [ejercicioId])

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async () => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await api.put(`/ejercicios/${ejercicioId}`, { ...form, dibujo_json: dibujo })
      setMensaje('Guardado correctamente')
      setTimeout(() => setMensaje(''), 2500)
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este ejercicio? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/ejercicios/${ejercicioId}`)
      navigate(`/entrenamientos/${id}`)
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el ejercicio'))
    }
  }

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error && !ejercicio) {
    return (
      <div className="page">
        <Link to={`/entrenamientos/${id}`} className="btn btn-ghost btn-sm">← Volver al entrenamiento</Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
      </div>
    )
  }

  return (
    <div className="page ejercicio-page">
      <Link to={`/entrenamientos/${id}`} className="btn btn-ghost btn-sm">← Volver al entrenamiento</Link>

      <div className="ej-hoja">
        <div className="ej-header">
          <div className="ej-header-club">
            <EscudoClub size={44} />
            <div>
              <strong>CLUB ATLÉTICO LANÚS</strong>
              <span>PLANIFICACIÓN TÁCTICA · CUERPO TÉCNICO</span>
            </div>
          </div>
          <div className="ej-header-datos">
            <div className="ej-header-numero">EJERCICIO {String(ejercicio.numero).padStart(2, '0')}</div>
            <div className="ej-header-campo">
              <label>Día:</label>
              <input type="date" value={form.dia} onChange={onChange('dia')} />
            </div>
            <div className="ej-header-campo">
              <label>Sesión N°:</label>
              <input value={form.sesion_numero} onChange={onChange('sesion_numero')} />
              <label>Turno:</label>
              <input value={form.turno} onChange={onChange('turno')} />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {mensaje && <div className="alert alert-success">{mensaje}</div>}

        <div className="ej-fila ej-fila-2">
          <div className="ej-campo">
            <label>Tipo de trabajo:</label>
            <input value={form.tipo_trabajo} onChange={onChange('tipo_trabajo')} />
          </div>
          <div className="ej-campo">
            <label>Espacio:</label>
            <input value={form.espacio} onChange={onChange('espacio')} />
          </div>
        </div>

        <div className="ej-fila">
          <div className="ej-campo">
            <label>Materiales:</label>
            <input value={form.materiales} onChange={onChange('materiales')} />
          </div>
        </div>

        <div className="ej-fila">
          <div className="ej-campo">
            <label>Objetivo del entrenamiento:</label>
            <input value={form.objetivo} onChange={onChange('objetivo')} />
          </div>
        </div>

        <div className="ej-fila ej-fila-2">
          <div className="ej-campo">
            <label>N° jugadores:</label>
            <input value={form.n_jugadores} onChange={onChange('n_jugadores')} />
          </div>
          <div className="ej-campo">
            <label>Duración:</label>
            <input value={form.duracion} onChange={onChange('duracion')} />
          </div>
        </div>

        <div className="ej-cuerpo">
          <div className="ej-cancha-col">
            <CanchaEditor value={dibujo} onChange={setDibujo} editable />
          </div>
          <div className="ej-texto-col">
            <div className="ej-campo ej-campo-grande">
              <label>Descripción del ejercicio:</label>
              <textarea rows={10} value={form.descripcion} onChange={onChange('descripcion')} />
            </div>
            <div className="ej-campo ej-campo-grande">
              <label>Puntuación:</label>
              <textarea rows={6} value={form.puntuacion} onChange={onChange('puntuacion')} />
            </div>
          </div>
        </div>

        <div className="ej-fila ej-fila-3 ej-footer">
          <div className="ej-campo">
            <label>Entrenador a cargo:</label>
            <input value={form.entrenador_a_cargo} onChange={onChange('entrenador_a_cargo')} />
          </div>
          <div className="ej-campo">
            <label>Jugadores:</label>
            <input value={form.jugadores} onChange={onChange('jugadores')} placeholder="Ej: Pérez, Gómez, López..." />
          </div>
          <div className="ej-campo">
            <label>Pechera:</label>
            <input value={form.pechera} onChange={onChange('pechera')} placeholder="Ej: Rojo vs. Amarillo" />
          </div>
        </div>
      </div>

      <div className="ej-acciones">
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? <span className="spinner" /> : 'Guardar'}
        </button>
        <button className="btn btn-ghost btn-danger" onClick={eliminar}>
          Eliminar ejercicio
        </button>
      </div>
    </div>
  )
}
