import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { formatFechaHora } from '../utils/fecha'
import './NotificacionesCampana.css'

const INTERVALO_MS = 60000

export default function NotificacionesCampana() {
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const [noLeidas, setNoLeidas] = useState(0)
  const ref = useRef(null)
  const navigate = useNavigate()

  const cargar = () => {
    api
      .get('/notificaciones')
      .then(({ data }) => {
        setNotificaciones(data.notificaciones)
        setNoLeidas(data.no_leidas)
      })
      .catch(() => {})
  }

  useEffect(() => {
    cargar()
    const intervalo = setInterval(cargar, INTERVALO_MS)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (!abierto) return
    const cerrarSiAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarSiAfuera)
    return () => document.removeEventListener('mousedown', cerrarSiAfuera)
  }, [abierto])

  const marcarTodasLeidas = async (e) => {
    e.stopPropagation()
    try {
      await api.put('/notificaciones/marcar-todas-leidas')
      setNotificaciones((lista) => lista.map((n) => ({ ...n, leida: 1 })))
      setNoLeidas(0)
    } catch {
      // no-op: el usuario puede reintentar
    }
  }

  const abrirNotificacion = async (notif) => {
    setAbierto(false)
    if (!notif.leida) {
      setNotificaciones((lista) => lista.map((n) => (n.id === notif.id ? { ...n, leida: 1 } : n)))
      setNoLeidas((n) => Math.max(0, n - 1))
      api.put(`/notificaciones/${notif.id}/leida`).catch(() => {})
    }
    navigate(notif.ruta)
  }

  return (
    <div className="notif-campana" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm notif-campana-boton"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
        title="Notificaciones"
      >
        🔔
        {noLeidas > 0 && <span className="notif-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      {abierto && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notificaciones</span>
            {noLeidas > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={marcarTodasLeidas}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="notif-lista">
            {notificaciones.length === 0 && <p className="notif-vacio">No tenés notificaciones</p>}
            {notificaciones.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notif-item ${n.leida ? '' : 'notif-item-no-leida'}`}
                onClick={() => abrirNotificacion(n)}
              >
                <span className="notif-item-titulo">{n.titulo}</span>
                <span className="notif-item-fecha">{formatFechaHora(n.creado_en)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
