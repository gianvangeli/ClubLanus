import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import CanchaMiniatura from '../components/CanchaMiniatura'
import EscudoClub from '../components/EscudoClub'
import './MicrocicloDetalle.css'

const CATEGORIAS = [
  { valor: 'preparador_fisico', etiqueta: 'Preparador físico' },
  { valor: 'cuerpo_tecnico', etiqueta: 'Cuerpo técnico' },
]

// Determina el color con el que el jugador ve cada bloque en su calendario
// mensual (ver MiCalendario.jsx): general=rojo, preparador_fisico=azul,
// cancha=verde, viaje=amarillo. La vieja "categoria" (cuerpo_tecnico /
// preparador_fisico) se sigue derivando sola en el backend a partir de
// esto, para no tocar el coloreado de esta pantalla semanal.
const TIPOS_ACTIVIDAD = [
  { valor: 'general', etiqueta: 'General', clase: 'mc-tipo-general' },
  { valor: 'preparador_fisico', etiqueta: 'Preparador físico', clase: 'mc-tipo-preparador_fisico' },
  { valor: 'cancha', etiqueta: 'Cancha', clase: 'mc-tipo-cancha' },
  { valor: 'viaje', etiqueta: 'Viaje', clase: 'mc-tipo-viaje' },
]

const ESPACIOS_TRABAJO = [
  { valor: 'completa', etiqueta: 'Cancha completa' },
  { valor: 'media', etiqueta: 'Media cancha' },
  { valor: 'reducido', etiqueta: 'Espacio reducido' },
  { valor: 'gimnasio', etiqueta: 'Gimnasio' },
]

const etiquetaCategoria = (valor) => CATEGORIAS.find((c) => c.valor === valor)?.etiqueta || valor

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Lista de fechas "YYYY-MM-DD" entre inicio y fin (inclusive), usando
// componentes UTC para no correrse un día por el huso horario del navegador.
const rangoDeFechas = (inicio, fin) => {
  const dias = []
  const cursor = new Date(`${String(inicio).slice(0, 10)}T00:00:00Z`)
  const limite = new Date(`${String(fin).slice(0, 10)}T00:00:00Z`)
  while (cursor <= limite) {
    dias.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dias
}

const FORM_VACIO = {
  hora_inicio: '',
  hora_fin: '',
  tipo_actividad: 'general',
  titulo: '',
  descripcion: '',
  espacio: '',
  orientacion: '',
  pse: '',
  objetivo: '',
  espacio_trabajo: '',
  jugadores_por_tarea: '',
}

export default function MicrocicloDetalle() {
  const { id } = useParams()
  const [microciclo, setMicrociclo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [bloqueEditando, setBloqueEditando] = useState(null) // { fecha, bloque | null }

  const cargar = () => {
    setCargando(true)
    api
      .get(`/calendario/${id}`)
      .then(({ data }) => setMicrociclo(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la semana')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [id])

  if (cargando) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (error && !microciclo) {
    return (
      <div className="page">
        <Link to="/admin/calendario" className="btn btn-ghost btn-sm">← Volver al calendario</Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
      </div>
    )
  }

  const dias = rangoDeFechas(microciclo.fecha_inicio, microciclo.fecha_fin)
  const bloquesPorDia = {}
  dias.forEach((d) => (bloquesPorDia[d] = []))
  microciclo.bloques.forEach((b) => {
    const fecha = String(b.fecha).slice(0, 10)
    if (bloquesPorDia[fecha]) bloquesPorDia[fecha].push(b)
  })

  const eliminarBloque = async (bloque) => {
    if (!window.confirm('¿Eliminar este bloque?')) return
    try {
      await api.delete(`/calendario/bloques/${bloque.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el bloque'))
    }
  }

  return (
    <div className="page">
      <Link to="/admin/calendario" className="btn btn-ghost btn-sm no-print">← Volver al calendario</Link>

      <div className="page-header no-print" style={{ marginTop: 16 }}>
        <div>
          <h1>{microciclo.nombre || 'Planificación semanal'}</h1>
          <p className="texto-muted">
            {formatFecha(microciclo.fecha_inicio)} al {formatFecha(microciclo.fecha_fin)}
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm no-print" onClick={() => window.print()}>
          Descargar PDF
        </button>
      </div>

      <div className="mc-print-header">
        <EscudoClub size={40} />
        <div>
          <strong>CLUB ATLÉTICO LANÚS — PLANIFICACIÓN SEMANAL</strong>
          <span>
            {microciclo.nombre ? `${microciclo.nombre} — ` : ''}
            {formatFecha(microciclo.fecha_inicio)} al {formatFecha(microciclo.fecha_fin)}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error no-print" style={{ marginTop: 12 }}>{error}</div>}

      <div className="mc-grilla">
        {dias.map((fecha) => {
          const fechaObj = new Date(`${fecha}T00:00:00Z`)
          return (
            <div key={fecha} className="mc-dia">
              <div className="mc-dia-header">
                <strong>{DIAS_SEMANA[fechaObj.getUTCDay()]}</strong>
                <span className="texto-muted">{formatFecha(fecha)}</span>
              </div>

              <div className="mc-dia-bloques">
                {bloquesPorDia[fecha].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`mc-bloque mc-bloque-${b.categoria}`}
                    onClick={() => setBloqueEditando({ fecha, bloque: b })}
                  >
                    <div className="mc-bloque-horario">
                      <span>
                        {b.hora_inicio?.slice(0, 5)}
                        {b.hora_fin ? ` - ${b.hora_fin.slice(0, 5)}` : ''}
                      </span>
                      <span className="mc-bloque-tag">{etiquetaCategoria(b.categoria)}</span>
                    </div>
                    {b.titulo && <strong className="mc-bloque-titulo">{b.titulo}</strong>}
                    {b.objetivo && <span className="mc-bloque-detalle">{b.objetivo}</span>}
                    {b.espacio_trabajo && (
                      <div className="mc-bloque-cancha">
                        <CanchaMiniatura tipo={b.espacio_trabajo} size={32} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button type="button" className="btn btn-ghost btn-sm mc-agregar no-print" onClick={() => setBloqueEditando({ fecha, bloque: null })}>
                + Bloque
              </button>
            </div>
          )
        })}
      </div>

      {bloqueEditando && (
        <FormBloque
          microcicloId={id}
          fecha={bloqueEditando.fecha}
          bloque={bloqueEditando.bloque}
          onGuardado={() => {
            setBloqueEditando(null)
            cargar()
          }}
          onCancelar={() => setBloqueEditando(null)}
          onEliminar={
            bloqueEditando.bloque
              ? () => {
                  eliminarBloque(bloqueEditando.bloque)
                  setBloqueEditando(null)
                }
              : null
          }
        />
      )}
    </div>
  )
}

function FormBloque({ microcicloId, fecha, bloque, onGuardado, onCancelar, onEliminar }) {
  const [form, setForm] = useState(
    bloque
      ? {
          hora_inicio: bloque.hora_inicio?.slice(0, 5) || '',
          hora_fin: bloque.hora_fin?.slice(0, 5) || '',
          tipo_actividad: bloque.tipo_actividad || 'general',
          titulo: bloque.titulo || '',
          descripcion: bloque.descripcion || '',
          espacio: bloque.espacio || '',
          orientacion: bloque.orientacion || '',
          pse: bloque.pse || '',
          objetivo: bloque.objetivo || '',
          espacio_trabajo: bloque.espacio_trabajo || '',
          jugadores_por_tarea: bloque.jugadores_por_tarea || '',
        }
      : FORM_VACIO
  )
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.hora_inicio || !form.tipo_actividad) {
      setError('Horario de inicio y tipo de actividad son obligatorios')
      return
    }

    setEnviando(true)
    try {
      if (bloque) {
        await api.put(`/calendario/bloques/${bloque.id}`, { ...form, fecha })
      } else {
        await api.post(`/calendario/${microcicloId}/bloques`, { ...form, fecha })
      }
      onGuardado()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el bloque'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mc-modal-overlay" onClick={onCancelar}>
      <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mc-modal-header">
          <h3>{bloque ? 'Editar bloque' : 'Nuevo bloque'} — {formatFecha(fecha)}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelar}>✕</button>
        </div>

        <form className="form-edicion" onSubmit={guardar}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="mc-form-row">
            <div className="field">
              <label>Hora de inicio</label>
              <input type="time" value={form.hora_inicio} onChange={onChange('hora_inicio')} required />
            </div>
            <div className="field">
              <label>Hora de fin (opcional)</label>
              <input type="time" value={form.hora_fin} onChange={onChange('hora_fin')} />
            </div>
          </div>

          <div className="field">
            <label>Tipo de actividad</label>
            <div className="mc-toggle-categoria">
              {TIPOS_ACTIVIDAD.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  className={`btn btn-sm ${form.tipo_actividad === t.valor ? 'btn-primary' : 'btn-ghost'} ${t.clase}`}
                  onClick={() =>
                    setForm(
                      t.valor === 'general'
                        ? { ...form, tipo_actividad: t.valor, espacio: '', orientacion: '', pse: '', objetivo: '', espacio_trabajo: '', jugadores_por_tarea: '' }
                        : { ...form, tipo_actividad: t.valor }
                    )
                  }
                >
                  {t.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Título</label>
            <input value={form.titulo} onChange={onChange('titulo')} placeholder="Ej: Rondos + finalización" />
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea rows={3} value={form.descripcion} onChange={onChange('descripcion')} />
          </div>

          {form.tipo_actividad !== 'general' && (
            <>
              <div className="mc-form-row">
                <div className="field">
                  <label>Espacio</label>
                  <input value={form.espacio} onChange={onChange('espacio')} placeholder="Ej: Cancha 3" />
                </div>
                <div className="field">
                  <label>Orientación</label>
                  <input value={form.orientacion} onChange={onChange('orientacion')} placeholder="Ej: Metabólica" />
                </div>
              </div>

              <div className="mc-form-row">
                <div className="field">
                  <label>PSE</label>
                  <input value={form.pse} onChange={onChange('pse')} placeholder="Ej: 6-8" />
                </div>
                <div className="field">
                  <label>Jugadores por tarea</label>
                  <input value={form.jugadores_por_tarea} onChange={onChange('jugadores_por_tarea')} placeholder="Ej: 10 vs 5" />
                </div>
              </div>

              <div className="field">
                <label>Objetivo</label>
                <input value={form.objetivo} onChange={onChange('objetivo')} placeholder="Ej: Recuperación muscular" />
              </div>

              <div className="field">
                <label>Espacio de trabajo</label>
                <div className="mc-espacios-trabajo">
                  {ESPACIOS_TRABAJO.map((e) => (
                    <button
                      key={e.valor}
                      type="button"
                      className={`mc-espacio-opcion ${form.espacio_trabajo === e.valor ? 'mc-espacio-opcion-activa' : ''}`}
                      onClick={() => setForm({ ...form, espacio_trabajo: form.espacio_trabajo === e.valor ? '' : e.valor })}
                    >
                      <CanchaMiniatura tipo={e.valor} size={38} />
                      <span>{e.etiqueta}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onCancelar}>
              Cancelar
            </button>
            {onEliminar && (
              <button className="btn btn-ghost btn-sm btn-danger" type="button" onClick={onEliminar} style={{ marginLeft: 'auto' }}>
                Eliminar bloque
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

