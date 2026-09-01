import { useEffect, useState } from 'react'
import api, { extraerError } from '../api/client'
import { agruparPorCategoria } from '../utils/agrupar'
import '../pages/PreparacionFisica.css'
import './ImportarEstadisticasPartidoPanel.css'

// Importación de estadísticas de partido por PDF (informe táctico estilo
// Wyscout) con IA: analiza el PDF, arma un preview de equipo + jugadores
// para revisar/corregir, y recién al confirmar se guarda.
export default function ImportarEstadisticasPartidoPanel({ onImportado }) {
  const [jugadores, setJugadores] = useState([])
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [rival, setRival] = useState('')
  const [condicion, setCondicion] = useState('local')
  const [resultado, setResultado] = useState('')
  const [competencia, setCompetencia] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [preview, setPreview] = useState(null)
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

    if (!fecha || !rival.trim()) {
      setError('Fecha y rival son obligatorios')
      return
    }
    if (!archivo) {
      setError('Subí el PDF del informe de partido')
      return
    }

    setAnalizando(true)
    try {
      const datos = new FormData()
      datos.append('archivo', archivo)
      const { data } = await api.post('/estadisticas-partido/analizar-pdf', datos)
      setPreview({
        equipo: data.equipo,
        jugadores: data.jugadores.map((f) => ({ ...f, incluir: Boolean(f.jugador_id) })),
      })
    } catch (err) {
      const detalle = err?.response?.data?.error
      const msg = extraerError(err, 'No se pudo analizar el PDF')
      setError(detalle && detalle !== msg ? `${msg}: ${detalle}` : msg)
    } finally {
      setAnalizando(false)
    }
  }

  const cambiarValorEquipo = (indice, campo) => (e) => {
    const valor = e.target.value === '' ? null : Number(e.target.value)
    setPreview((prev) => ({
      ...prev,
      equipo: prev.equipo.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    }))
  }

  const cambiarJugador = (indice, jugadorId) => {
    setPreview((prev) => ({
      ...prev,
      jugadores: prev.jugadores.map((f, i) =>
        i === indice ? { ...f, jugador_id: jugadorId ? Number(jugadorId) : null } : f
      ),
    }))
  }

  const toggleIncluir = (indice) => {
    setPreview((prev) => ({
      ...prev,
      jugadores: prev.jugadores.map((f, i) => (i === indice ? { ...f, incluir: !f.incluir } : f)),
    }))
  }

  const jugadoresAIncluir = (preview?.jugadores || []).filter((f) => f.incluir)
  const puedeConfirmar = (preview?.equipo || []).length > 0 && jugadoresAIncluir.every((f) => f.jugador_id)

  const confirmar = async () => {
    setError('')
    setConfirmando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', fecha)
      datos.append('rival', rival)
      datos.append('condicion', condicion)
      if (resultado) datos.append('resultado', resultado)
      if (competencia) datos.append('competencia', competencia)
      datos.append('equipo', JSON.stringify(preview.equipo))
      datos.append(
        'jugadores',
        JSON.stringify(jugadoresAIncluir.map((f) => ({ jugador_id: f.jugador_id, indicadores: f.indicadores })))
      )
      if (archivo) datos.append('archivo', archivo)

      const { data } = await api.post('/estadisticas-partido', datos)
      setMensaje(`Partido importado correctamente (${data.jugadores_importados} jugador(es)).`)
      setPreview(null)
      setArchivo(null)
      setRival('')
      setResultado('')
      setCompetencia('')
      onImportado?.()
    } catch (err) {
      setError(extraerError(err, 'No se pudo confirmar la importación'))
    } finally {
      setConfirmando(false)
    }
  }

  const sinDatos = preview && preview.equipo.length === 0 && preview.jugadores.length === 0

  return (
    <div>
      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Subí el informe de partido (PDF estilo Wyscout) y una IA va a leer las estadísticas de equipo y por jugador.{' '}
        <strong>Revisá y corregí antes de confirmar</strong>: no se guarda nada hasta que lo confirmes.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      {!preview && (
        <form className="form-edicion" onSubmit={analizar}>
          <div className="ep-form-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="field">
              <label>Rival</label>
              <input value={rival} onChange={(e) => setRival(e.target.value)} placeholder="Ej: Colón" required />
            </div>
            <div className="field">
              <label>Condición</label>
              <select value={condicion} onChange={(e) => setCondicion(e.target.value)}>
                <option value="local">Local</option>
                <option value="visitante">Visitante</option>
              </select>
            </div>
          </div>
          <div className="ep-form-row">
            <div className="field">
              <label>Resultado (opcional)</label>
              <input value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Ej: 2-0" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Competencia (opcional)</label>
              <input
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="Ej: Torneo Proyección"
              />
            </div>
          </div>
          <div className="field">
            <label>PDF del informe de partido</label>
            <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files[0] || null)} />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={analizando}>
            {analizando ? <span className="spinner" /> : 'Analizar con IA'}
          </button>
          {analizando && (
            <p className="texto-muted">
              Leyendo el PDF con IA, puede tardar unos minutos (reintenta solo si el modelo está saturado). No cierres
              esta pantalla.
            </p>
          )}
        </form>
      )}

      {preview && (
        <div>
          <div className="seccion-header">
            <h4 className="subtitulo">Revisión antes de importar</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>
              Volver a analizar
            </button>
          </div>

          {sinDatos && (
            <div className="alert alert-error">
              La IA no detectó estadísticas de partido en este PDF. Revisá que sea el informe táctico correcto (no
              otro tipo de documento).
            </div>
          )}

          {preview.equipo.length > 0 && (
            <div className="ep-bloque">
              <h5 className="ep-bloque-titulo">Estadísticas de equipo (Lanús vs {rival || 'rival'})</h5>
              {agruparPorCategoria(preview.equipo).map(({ categoria, items }) => (
                <div key={categoria} className="pf-categoria">
                  <h4>{categoria}</h4>
                  <div className="ep-tabla-equipo">
                    {items.map((item) => {
                      const indice = preview.equipo.indexOf(item)
                      return (
                        <div className="ep-fila-equipo" key={indice}>
                          <span className="ep-fila-equipo-nombre">{item.indicador}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.valor_lanus ?? ''}
                            onChange={cambiarValorEquipo(indice, 'valor_lanus')}
                            placeholder="Lanús"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.valor_rival ?? ''}
                            onChange={cambiarValorEquipo(indice, 'valor_rival')}
                            placeholder="Rival"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {preview.jugadores.length > 0 && (
            <div className="ep-bloque">
              <h5 className="ep-bloque-titulo">Estadísticas por jugador</h5>
              <p className="texto-muted" style={{ marginBottom: 12 }}>
                Revisá que cada fila esté asignada al jugador correcto. Las filas sin jugador asignado no se pueden
                importar.
              </p>
              <div className="ep-filas">
                {preview.jugadores.map((f, i) => (
                  <div className="ep-fila" key={i}>
                    <div className="ep-fila-header">
                      <label className="ep-check">
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
                    <div className="pf-pico-categorias">
                      {agruparPorCategoria(f.indicadores).map(({ categoria, items }) => (
                        <div key={categoria} className="pf-pico-categoria">
                          <h5>{categoria}</h5>
                          <div className="pf-pico-indicadores">
                            {items.map((ind, idx) => (
                              <span key={idx} className="pf-indicador-chip">
                                {ind.indicador}: <strong>{ind.valor}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
            onClick={confirmar}
            disabled={!puedeConfirmar || confirmando}
          >
            {confirmando ? <span className="spinner" /> : 'Confirmar e importar'}
          </button>
          {!puedeConfirmar && preview.equipo.length > 0 && jugadoresAIncluir.length > 0 && (
            <p className="texto-muted">Asigná un jugador a todas las filas tildadas para poder confirmar.</p>
          )}
        </div>
      )}
    </div>
  )
}
