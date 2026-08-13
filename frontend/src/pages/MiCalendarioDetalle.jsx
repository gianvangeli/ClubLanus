import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFecha } from '../utils/fecha'
import CanchaMiniatura from '../components/CanchaMiniatura'
import './MicrocicloDetalle.css'

const CATEGORIAS = [
  { valor: 'preparador_fisico', etiqueta: 'Preparador físico' },
  { valor: 'cuerpo_tecnico', etiqueta: 'Cuerpo técnico' },
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

// Vista de solo lectura para el jugador: misma grilla que ve el cuerpo
// técnico, pero solo con los campos "públicos" de cada bloque (horario,
// tipo de trabajo, título, objetivo y espacio de trabajo) — nunca
// descripción, espacio, orientación, PSE ni jugadores por tarea, que son
// de trabajo interno.
export default function MiCalendarioDetalle() {
  const { id } = useParams()
  const [microciclo, setMicrociclo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/calendario/jugador/${id}`)
      .then(({ data }) => setMicrociclo(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar la semana')))
      .finally(() => setCargando(false))
  }, [id])

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
        <Link to="/calendario" className="btn btn-ghost btn-sm">← Volver al calendario</Link>
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

  return (
    <div className="page">
      <Link to="/calendario" className="btn btn-ghost btn-sm">← Volver al calendario</Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>{microciclo.nombre || 'Planificación semanal'}</h1>
          <p className="texto-muted">
            {formatFecha(microciclo.fecha_inicio)} al {formatFecha(microciclo.fecha_fin)}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

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
                  <div key={b.id} className={`mc-bloque mc-bloque-${b.categoria}`}>
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
                  </div>
                ))}
                {bloquesPorDia[fecha].length === 0 && (
                  <span className="texto-muted" style={{ fontSize: 12 }}>Sin actividades</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
