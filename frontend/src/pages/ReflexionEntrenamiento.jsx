import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import EscudoClub from '../components/EscudoClub'
import './EjercicioDetalle.css'
import './ReflexionEntrenamiento.css'

const PREGUNTAS = [
  {
    campo: 'reflexion_logro_objetivo',
    titulo: '1. ¿Se logró el objetivo de la sesión?',
    ayuda: '¿Los jugadores comprendieron qué quería enseñar? ¿Las tareas respondieron al objetivo? ¿Hubo transferencia hacia situaciones reales de juego?',
  },
  {
    campo: 'reflexion_respuesta_jugadores',
    titulo: '2. ¿Cómo respondieron los jugadores?',
    ayuda: '¿Todos participaron activamente? ¿El nivel de dificultad fue adecuado? ¿Estuvieron motivados? ¿Qué errores aparecieron? ¿Qué aprendizajes evidenciaron?',
  },
  {
    campo: 'reflexion_intervencion_ct',
    titulo: '3. ¿Cómo fue nuestra intervención (CT)?',
    ayuda: '¿Expliqué con claridad? ¿Intervine demasiado o poco? ¿Elegí bien cuándo detener la tarea? ¿Las correcciones fueron oportunas? ¿Fue coherente con el modelo de juego?',
  },
  {
    campo: 'reflexion_modificaciones',
    titulo: '4. ¿Qué debo modificar para la próxima sesión?',
    ayuda: '¿Qué ejercicios funcionaron y cuáles no? ¿Aumentar o disminuir la complejidad? ¿Retomar algún contenido? ¿Qué continuidad tendrá esta sesión?',
  },
]

const CAMPOS_VACIOS = {
  reflexion_dia: '',
  reflexion_sesion_numero: '',
  reflexion_turno: '',
  reflexion_objetivo: '',
  reflexion_logro_objetivo: '',
  reflexion_respuesta_jugadores: '',
  reflexion_intervencion_ct: '',
  reflexion_modificaciones: '',
  reflexion_entrenador_cargo: '',
  reflexion_firma: '',
}

export default function ReflexionEntrenamiento() {
  const { id } = useParams()
  const [sesion, setSesion] = useState(null)
  const [form, setForm] = useState(CAMPOS_VACIOS)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/entrenamientos/${id}/reflexion`)
      .then(({ data }) => {
        setSesion(data)
        setForm({
          reflexion_dia: data.reflexion_dia ? String(data.reflexion_dia).slice(0, 10) : String(data.fecha).slice(0, 10),
          reflexion_sesion_numero: data.reflexion_sesion_numero || '',
          reflexion_turno: data.reflexion_turno || '',
          reflexion_objetivo: data.reflexion_objetivo || '',
          reflexion_logro_objetivo: data.reflexion_logro_objetivo || '',
          reflexion_respuesta_jugadores: data.reflexion_respuesta_jugadores || '',
          reflexion_intervencion_ct: data.reflexion_intervencion_ct || '',
          reflexion_modificaciones: data.reflexion_modificaciones || '',
          reflexion_entrenador_cargo: data.reflexion_entrenador_cargo || '',
          reflexion_firma: data.reflexion_firma || '',
        })
      })
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la reflexión')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [id])

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async () => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await api.put(`/entrenamientos/${id}/reflexion`, form)
      setMensaje('Guardado correctamente')
      setTimeout(() => setMensaje(''), 2500)
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar'))
    } finally {
      setGuardando(false)
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

  if (error && !sesion) {
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
            <div className="ej-header-numero">REFLEXIÓN DEL ENTRENAMIENTO</div>
            <div className="ej-header-campo">
              <label>Día:</label>
              <input type="date" value={form.reflexion_dia} onChange={onChange('reflexion_dia')} />
            </div>
            <div className="ej-header-campo">
              <label>Sesión N°:</label>
              <input value={form.reflexion_sesion_numero} onChange={onChange('reflexion_sesion_numero')} />
              <label>Turno:</label>
              <input value={form.reflexion_turno} onChange={onChange('reflexion_turno')} />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {mensaje && <div className="alert alert-success">{mensaje}</div>}

        <div className="ej-fila">
          <div className="ej-campo">
            <label>Objetivo de la sesión (referencia):</label>
            <input value={form.reflexion_objetivo} onChange={onChange('reflexion_objetivo')} />
          </div>
        </div>

        <div className="ref-preguntas">
          {PREGUNTAS.map((p) => (
            <div className="ref-pregunta" key={p.campo}>
              <div className="ref-pregunta-header">{p.titulo}</div>
              <p className="ref-pregunta-ayuda">{p.ayuda}</p>
              <textarea
                rows={6}
                value={form[p.campo]}
                onChange={onChange(p.campo)}
                placeholder="Escribí tu reflexión acá..."
              />
            </div>
          ))}
        </div>

        <div className="ej-fila ej-fila-2 ej-footer">
          <div className="ej-campo">
            <label>Entrenador a cargo:</label>
            <input value={form.reflexion_entrenador_cargo} onChange={onChange('reflexion_entrenador_cargo')} />
          </div>
          <div className="ej-campo">
            <label>Firma:</label>
            <input value={form.reflexion_firma} onChange={onChange('reflexion_firma')} placeholder="Nombre y apellido" />
          </div>
        </div>
      </div>

      <div className="ej-acciones">
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? <span className="spinner" /> : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
