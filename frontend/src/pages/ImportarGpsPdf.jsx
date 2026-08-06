import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { extraerError } from '../api/client'
import './PreparacionFisica.css'
import './ImportarGpsPdf.css'

export default function ImportarGpsPdf() {
  const navigate = useNavigate()
  const [jugadores, setJugadores] = useState([])
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [partido, setPartido] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [filas, setFilas] = useState(null)
  const [confirmando, setConfirmando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/jugadores').then(({ data }) => setJugadores(data))
  }, [])

  const analizar = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    if (!fecha || !partido.trim()) {
      setError('Fecha y partido son obligatorios')
      return
    }
    if (!archivo) {
      setError('Subí el PDF con los datos de GPS')
      return
    }

    setAnalizando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', fecha)
      datos.append('partido', partido)
      datos.append('archivo', archivo)
      const { data } = await api.post('/jugadores/gps/importar-pdf', datos)
      setFilas(
        data.filas.map((f) => ({
          ...f,
          incluir: Boolean(f.jugador_id),
        }))
      )
    } catch (err) {
      setError(extraerError(err, 'No se pudo analizar el PDF'))
    } finally {
      setAnalizando(false)
    }
  }

  const cambiarJugador = (indice, jugadorId) => {
    setFilas((prev) =>
      prev.map((f, i) => (i === indice ? { ...f, jugador_id: jugadorId ? Number(jugadorId) : null } : f))
    )
  }

  const toggleIncluir = (indice) => {
    setFilas((prev) => prev.map((f, i) => (i === indice ? { ...f, incluir: !f.incluir } : f)))
  }

  const filasAIncluir = (filas || []).filter((f) => f.incluir)
  const puedeConfirmar = filasAIncluir.length > 0 && filasAIncluir.every((f) => f.jugador_id)

  const confirmar = async () => {
    setError('')
    setConfirmando(true)
    try {
      const { data } = await api.post('/jugadores/gps/confirmar', {
        fecha,
        partido,
        filas: filasAIncluir.map((f) => ({ jugador_id: f.jugador_id, indicadores: f.indicadores })),
      })
      setMensaje(`Se importaron ${data.importados} jugador(es) correctamente.`)
      setFilas(null)
      setTimeout(() => navigate('/admin/jugadores'), 1800)
    } catch (err) {
      setError(extraerError(err, 'No se pudo confirmar la importación'))
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="page">
      <Link to="/admin/jugadores" className="btn btn-ghost btn-sm">
        ← Volver a jugadores
      </Link>

      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1>Importar GPS (PDF)</h1>
          <p>
            Subí el reporte de GPS de todo el plantel (entrenamiento o partido) y una IA va a leer los datos de
            cada jugador. <strong>Revisá y corregí antes de confirmar</strong>: no se guarda nada hasta que lo
            confirmes.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      {!filas && (
        <form className="card seccion form-edicion" onSubmit={analizar}>
          <div className="gps-form-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="field">
              <label>Entrenamiento o partido</label>
              <input
                value={partido}
                onChange={(e) => setPartido(e.target.value)}
                placeholder="Ej: Entrenamiento martes, Fecha 18 vs Boca"
                required
              />
            </div>
          </div>
          <div className="field">
            <label>PDF de GPS (todo el plantel)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files[0] || null)} />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={analizando}>
            {analizando ? <span className="spinner" /> : 'Analizar con IA'}
          </button>
          {analizando && <p className="texto-muted">Leyendo el PDF con IA, puede tardar unos segundos...</p>}
        </form>
      )}

      {filas && (
        <div className="card seccion">
          <div className="seccion-header">
            <h3>Revisión antes de importar</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilas(null)}>
              Volver a analizar
            </button>
          </div>

          <p className="texto-muted" style={{ marginBottom: 12 }}>
            Revisá que cada fila esté asignada al jugador correcto. Las filas sin jugador asignado no se pueden
            importar.
          </p>

          <div className="gps-filas">
            {filas.map((f, i) => (
              <div className="gps-fila" key={i}>
                <div className="gps-fila-header">
                  <label className="gps-check">
                    <input type="checkbox" checked={f.incluir} onChange={() => toggleIncluir(i)} />
                    Importar
                  </label>
                  <span className="texto-muted">PDF: "{f.nombre_detectado}"</span>
                  <select
                    value={f.jugador_id || ''}
                    onChange={(e) => cambiarJugador(i, e.target.value)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <option value="">Sin asignar</option>
                    {jugadores.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nombre} {j.apellido}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pf-pico-indicadores">
                  {f.indicadores.length === 0 && <span className="texto-muted">Sin indicadores detectados</span>}
                  {f.indicadores.map((ind, idx) => (
                    <span key={idx} className="pf-indicador-chip">
                      {ind.indicador}: <strong>{ind.valor}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
            onClick={confirmar}
            disabled={!puedeConfirmar || confirmando}
          >
            {confirmando ? <span className="spinner" /> : `Confirmar e importar (${filasAIncluir.length})`}
          </button>
          {!puedeConfirmar && filasAIncluir.length > 0 && (
            <p className="texto-muted">Asigná un jugador a todas las filas tildadas para poder confirmar.</p>
          )}
        </div>
      )}
    </div>
  )
}
