import { useEffect, useState } from 'react'
import api, { extraerError } from '../api/client'
import './MiCalendario.css'

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Mismos 4 colores para el jugador: general (comidas, videos, reuniones) en
// rojo, todo lo de preparador físico en azul, cuerpo técnico en cancha en
// verde, viajes en amarillo. El cuerpo técnico elige uno de estos 4 al
// cargar/editar un bloque (ver MicrocicloDetalle.jsx).
const TIPOS = [
  { valor: 'general', etiqueta: 'General (comidas, video, reuniones)', clase: 'cal-general' },
  { valor: 'preparador_fisico', etiqueta: 'Preparador físico', clase: 'cal-preparador_fisico' },
  { valor: 'cancha', etiqueta: 'Cuerpo técnico (cancha)', clase: 'cal-cancha' },
  { valor: 'viaje', etiqueta: 'Viaje', clase: 'cal-viaje' },
]
const claseTipo = (tipo) => TIPOS.find((t) => t.valor === tipo)?.clase || 'cal-general'

const MAX_VISIBLES = 3

// Matriz de 42 días (6 semanas x 7, Domingo a Sábado) que cubre el mes
// completo, con días del mes anterior/siguiente para completar la primera
// y la última semana (se muestran atenuados, igual que un calendario común).
const armarGrilla = (anio, mes) => {
  const primerDia = new Date(anio, mes - 1, 1)
  const inicio = new Date(primerDia)
  inicio.setDate(inicio.getDate() - primerDia.getDay())

  const dias = []
  const cursor = new Date(inicio)
  for (let i = 0; i < 42; i++) {
    dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

const aClave = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function MiCalendario() {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [bloques, setBloques] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [diaExpandido, setDiaExpandido] = useState(null)

  useEffect(() => {
    setCargando(true)
    setDiaExpandido(null)
    api
      .get('/calendario/jugador/mes', { params: { anio, mes } })
      .then(({ data }) => setBloques(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el calendario')))
      .finally(() => setCargando(false))
  }, [anio, mes])

  const cambiarMes = (delta) => {
    let m = mes + delta
    let a = anio
    if (m < 1) {
      m = 12
      a -= 1
    } else if (m > 12) {
      m = 1
      a += 1
    }
    setMes(m)
    setAnio(a)
  }

  const bloquesPorDia = {}
  bloques.forEach((b) => {
    const clave = String(b.fecha).slice(0, 10)
    ;(bloquesPorDia[clave] = bloquesPorDia[clave] || []).push(b)
  })

  const dias = armarGrilla(anio, mes)
  const hoyClave = aClave(hoy)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Calendario</h1>
      </div>

      <div className="cal-mes-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarMes(-1)}>
          ‹
        </button>
        <h2>
          {MESES[mes - 1]} {anio}
        </h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarMes(1)}>
          ›
        </button>
      </div>

      <div className="cal-leyenda">
        {TIPOS.map((t) => (
          <span key={t.valor} className="cal-leyenda-item">
            <span className={`cal-punto ${t.clase}`} />
            {t.etiqueta}
          </span>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando ? (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      ) : (
        <div className="cal-grilla">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="cal-dia-nombre">
              {d}
            </div>
          ))}

          {dias.map((d) => {
            const clave = aClave(d)
            const esDelMes = d.getMonth() + 1 === mes
            const items = bloquesPorDia[clave] || []
            const expandido = diaExpandido === clave
            const visibles = expandido ? items : items.slice(0, MAX_VISIBLES)
            const restantes = items.length - visibles.length

            return (
              <div
                key={clave}
                className={`cal-celda ${esDelMes ? '' : 'cal-celda-afuera'} ${clave === hoyClave ? 'cal-celda-hoy' : ''}`}
              >
                <span className="cal-celda-numero">{d.getDate()}</span>
                <div className="cal-celda-eventos">
                  {visibles.map((b) => (
                    <div key={b.id} className={`cal-chip ${claseTipo(b.tipo_actividad)}`} title={b.objetivo || b.titulo || ''}>
                      <span className="cal-chip-hora">{b.hora_inicio?.slice(0, 5)}</span>
                      <span className="cal-chip-titulo">{b.titulo || 'Actividad'}</span>
                    </div>
                  ))}
                  {restantes > 0 && (
                    <button type="button" className="cal-mas" onClick={() => setDiaExpandido(clave)}>
                      +{restantes} más
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
