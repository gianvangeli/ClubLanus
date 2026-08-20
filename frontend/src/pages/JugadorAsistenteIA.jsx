import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import { formatFechaHora } from '../utils/fecha'
import { colorSemaforo } from '../utils/semaforo'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import './AdminJugadorDetalle.css'
import './JugadorAsistenteIA.css'

const ETIQUETA_RIESGO = { verde: 'Riesgo bajo', amarillo: 'Riesgo a vigilar', rojo: 'Riesgo alto' }

export default function JugadorAsistenteIA() {
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
        <h1>Asistente IA{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="asistente-ia" />
      </div>

      {jugador && <BannerRiesgo jugador={jugador} />}

      <ChatAsistenteIA jugadorId={id} />
    </div>
  )
}

function BannerRiesgo({ jugador }) {
  if (!jugador.semaforo_riesgo_ia) {
    return (
      <div className="aia-banner aia-banner-sin-datos">
        <span className="aia-banner-dot" style={{ background: colorSemaforo(null) }} />
        <div>
          <strong>Riesgo de lesión: sin evaluar todavía</strong>
          <p className="texto-muted">
            Se calcula solo apenas se carguen datos de lesiones, composición corporal, nutrición o cargas físicas/GPS.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="aia-banner">
      <span className="aia-banner-dot" style={{ background: colorSemaforo(jugador.semaforo_riesgo_ia) }} />
      <div>
        <strong>{ETIQUETA_RIESGO[jugador.semaforo_riesgo_ia] || 'Riesgo de lesión'}</strong>
        <p className="texto-muted">
          {jugador.motivo_riesgo_ia}
          {jugador.riesgo_ia_actualizado_en && ` · Actualizado el ${formatFechaHora(jugador.riesgo_ia_actualizado_en)}`}
        </p>
      </div>
    </div>
  )
}

function ChatAsistenteIA({ jugadorId }) {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const finRef = useRef(null)

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/asistente-ia`)
      .then(({ data }) => setMensajes(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el chat')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, enviando])

  const enviar = async (e) => {
    e.preventDefault()
    if (!texto.trim() || enviando) return

    setError('')
    const mensaje = texto.trim()
    setTexto('')
    setEnviando(true)
    try {
      const { data } = await api.post(`/jugadores/${jugadorId}/asistente-ia`, { mensaje })
      setMensajes((prev) => [...prev, ...data])
    } catch (err) {
      setError(extraerError(err, 'No se pudo enviar el mensaje'))
      setTexto(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const nuevaConversacion = async () => {
    if (!window.confirm('¿Borrar esta conversación y empezar una nueva?')) return
    try {
      await api.delete(`/jugadores/${jugadorId}/asistente-ia`)
      setMensajes([])
    } catch (err) {
      setError(extraerError(err, 'No se pudo borrar la conversación'))
    }
  }

  const descargarArchivo = (archivo) => {
    const escaparCsv = (valor) => {
      const t = String(valor ?? '')
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
    }
    const lineas = [
      archivo.columnas.map(escaparCsv).join(','),
      ...archivo.filas.map((fila) => fila.map(escaparCsv).join(',')),
    ]
    const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = archivo.nombre.endsWith('.csv') ? archivo.nombre : `${archivo.nombre}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Chat con el Asistente IA</h3>
        {mensajes.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={nuevaConversacion}>
            Nueva conversación
          </button>
        )}
      </div>

      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Preguntale sobre lesiones, composición corporal, nutrición y cargas físicas/GPS de este jugador (y las de su
        categoría): entender sus límites, anticipar riesgo de lesión, comparar, sacar conclusiones o pedir un
        archivo con datos puntuales.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando ? (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      ) : (
        <>
          <div className="chat-ia-mensajes">
            {mensajes.length === 0 && (
              <p className="texto-muted">Todavía no hay conversación. Escribí tu primera pregunta abajo.</p>
            )}
            {mensajes.map((m) => (
              <div key={m.id} className={`chat-ia-burbuja chat-ia-burbuja-${m.rol}`}>
                <p>{m.contenido}</p>
                {m.archivo && (
                  <button className="btn btn-ghost btn-sm" onClick={() => descargarArchivo(m.archivo)}>
                    ⬇ Descargar {m.archivo.nombre}
                  </button>
                )}
              </div>
            ))}
            {enviando && (
              <div className="chat-ia-burbuja chat-ia-burbuja-asistente">
                <span className="spinner spinner-dark" />
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form className="chat-ia-form" onSubmit={enviar}>
            <textarea
              rows={2}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ej: ¿Cómo viene este jugador en general, hay algo que debamos vigilar?"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  enviar(e)
                }
              }}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando || !texto.trim()}>
              {enviando ? <span className="spinner" /> : 'Enviar'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
