import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import { aNumero } from '../utils/numero'
import { formatFecha } from '../utils/fecha'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import GraficoTendencia from '../components/GraficoTendencia'
import './AdminJugadorDetalle.css'
import './PreparacionFisica.css'

const TABS = [
  { key: 'informe', etiqueta: 'Informe físico' },
  { key: 'picos', etiqueta: 'Cargas físicas' },
  { key: 'chat', etiqueta: 'Chat con IA' },
  { key: 'extra', etiqueta: 'Entrenamientos extra' },
]

// Modelo de indicadores de partida, según el ejemplo pasado por el cuerpo
// técnico. Se puede seguir ajustando: el formulario permite además cargar
// indicadores personalizados (ver "+ Agregar indicador").
const PLANTILLA_INDICADORES = [
  { categoria: 'Volumen de trabajo', indicadores: ['Distancia total (m)', 'Metros/min', 'PL por minuto'] },
  {
    categoria: 'Alta intensidad',
    indicadores: ['HSR', 'Metros 19-24 km/h', 'Metros > 24 km/h', 'Metros > 30 km/h'],
  },
  {
    categoria: 'Explosividad y velocidad',
    indicadores: ['Velocidad máxima (km/h)', 'Sprints', 'RHIE — total de series'],
  },
  {
    categoria: 'Frenos y arranques',
    indicadores: [
      'Aceleraciones Z2+Z3 (esfuerzos)',
      'Desaceleraciones Z2-Z3 (esfuerzos)',
      'Acc/Dec Z2-Z3 (esfuerzos)',
      'Acc/Dec Z2-Z3 (por minuto)',
    ],
  },
]

export default function JugadorPreparacionFisica() {
  const { id } = useParams()
  const [jugador, setJugador] = useState(null)
  const [tab, setTab] = useState('informe')

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
        <h1>Preparación física{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="preparacion-fisica" />
      </div>

      <div className="pf-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.key)}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {tab === 'informe' && (
        <>
          <ResumenFisicoAutomatico jugadorId={id} />
          <InformeFisico jugadorId={id} />
        </>
      )}
      {tab === 'picos' && <PicosRendimiento jugadorId={id} />}
      {tab === 'chat' && <ChatIA jugadorId={id} />}
      {tab === 'extra' && <EntrenamientosExtra jugadorId={id} />}
    </div>
  )
}

function PicosRendimiento({ jugadorId }) {
  const [picos, setPicos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [fecha, setFecha] = useState('')
  const [partido, setPartido] = useState('')
  const [valores, setValores] = useState({})
  const [extras, setExtras] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [modoComparar, setModoComparar] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const [modoGrafico, setModoGrafico] = useState(false)
  const [indicadorGrafico, setIndicadorGrafico] = useState('')
  const [modoComparativa, setModoComparativa] = useState(false)
  const [roster, setRoster] = useState([])
  const [jugadoresComparar, setJugadoresComparar] = useState([])
  const [periodoComparar, setPeriodoComparar] = useState('semana')
  const [comparativa, setComparativa] = useState(null)
  const [cargandoComparativa, setCargandoComparativa] = useState(false)

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/picos-rendimiento`)
      .then(({ data }) => setPicos(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  useEffect(() => {
    api.get('/jugadores').then(({ data }) => setRoster(data.filter((j) => String(j.id) !== String(jugadorId))))
  }, [jugadorId])

  const abrirForm = () => {
    setFecha(new Date().toISOString().slice(0, 10))
    setPartido('')
    setValores({})
    setExtras([])
    setError('')
    setMostrarForm(true)
  }

  const onCambiarValor = (clave) => (e) => setValores({ ...valores, [clave]: e.target.value })

  const agregarExtra = () => setExtras([...extras, { categoria: '', indicador: '', valor: '' }])
  const cambiarExtra = (i, campo) => (e) => {
    const copia = [...extras]
    copia[i] = { ...copia[i], [campo]: e.target.value }
    setExtras(copia)
  }
  const quitarExtra = (i) => setExtras(extras.filter((_, idx) => idx !== i))

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!fecha || !partido.trim()) {
      setError('Fecha y partido son obligatorios')
      return
    }

    const indicadores = []
    for (const { categoria, indicadores: nombres } of PLANTILLA_INDICADORES) {
      for (const nombre of nombres) {
        const clave = `${categoria}|${nombre}`
        const valor = aNumero(valores[clave])
        if (valor === undefined) {
          setError(`"${nombre}" tiene que ser un número (podés usar coma o punto)`)
          return
        }
        if (valor !== null) {
          indicadores.push({ categoria, indicador: nombre, valor })
        }
      }
    }

    for (const extra of extras) {
      if (!extra.indicador.trim()) continue
      const valor = aNumero(extra.valor)
      if (valor === undefined) {
        setError(`"${extra.indicador}" tiene que ser un número (podés usar coma o punto)`)
        return
      }
      if (valor !== null) {
        indicadores.push({ categoria: extra.categoria || 'Otros', indicador: extra.indicador, valor })
      }
    }

    if (indicadores.length === 0) {
      setError('Cargá al menos un indicador')
      return
    }

    setEnviando(true)
    try {
      await api.post(`/jugadores/${jugadorId}/picos-rendimiento`, { fecha, partido, indicadores })
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar la evaluación'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (pico) => {
    if (!window.confirm(`¿Eliminar la evaluación del ${formatFecha(pico.fecha)} (${pico.partido})?`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${jugadorId}/picos-rendimiento/${pico.id}`)
      setSeleccionados((prev) => prev.filter((selId) => selId !== pico.id))
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar la evaluación'))
    }
  }

  const toggleSeleccionado = (picoId) => {
    setSeleccionados((prev) => (prev.includes(picoId) ? prev.filter((selId) => selId !== picoId) : [...prev, picoId]))
  }

  const picosSeleccionados = picos.filter((p) => seleccionados.includes(p.id))
  const indicadoresComparados = Array.from(
    new Set(picosSeleccionados.flatMap((p) => p.indicadores.map((i) => `${i.categoria}|${i.indicador}`)))
  )

  // Indicadores disponibles para graficar: unión de todos los que tenga
  // cargados este jugador en cualquier evaluación, agrupados por categoría.
  const indicadoresPorCategoria = {}
  picos.forEach((p) =>
    p.indicadores.forEach((ind) => {
      const set = indicadoresPorCategoria[ind.categoria] || new Set()
      set.add(ind.indicador)
      indicadoresPorCategoria[ind.categoria] = set
    })
  )
  const clavesDisponibles = Object.entries(indicadoresPorCategoria).flatMap(([categoria, nombres]) =>
    Array.from(nombres).map((nombre) => `${categoria}|${nombre}`)
  )
  const claveActiva = indicadorGrafico && clavesDisponibles.includes(indicadorGrafico) ? indicadorGrafico : clavesDisponibles[0] || ''
  const [categoriaActiva, indicadorActivo] = claveActiva ? claveActiva.split('|') : [null, null]
  const puntosGrafico = picos
    .map((p) => ({
      fecha: p.fecha,
      valor: p.indicadores.find((i) => i.categoria === categoriaActiva && i.indicador === indicadorActivo)?.valor,
    }))
    .filter((p) => typeof p.valor === 'number')

  const toggleJugadorComparar = (id) => {
    setJugadoresComparar((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const buscarComparativa = async () => {
    if (!categoriaActiva || !indicadorActivo || jugadoresComparar.length === 0) return
    setCargandoComparativa(true)
    try {
      const { data } = await api.get('/jugadores/picos-rendimiento/comparar', {
        params: {
          jugadores: [jugadorId, ...jugadoresComparar].join(','),
          categoria: categoriaActiva,
          indicador: indicadorActivo,
          periodo: periodoComparar,
        },
      })
      setComparativa(data)
    } catch (err) {
      setError(extraerError(err, 'No se pudo comparar'))
    } finally {
      setCargandoComparativa(false)
    }
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Cargas físicas</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${modoComparar ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setModoComparar(!modoComparar)
              setSeleccionados([])
            }}
          >
            Comparar fechas
          </button>
          <button
            type="button"
            className={`btn btn-sm ${modoGrafico ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setModoGrafico(!modoGrafico)}
          >
            Gráficos
          </button>
          <button
            type="button"
            className={`btn btn-sm ${modoComparativa ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setModoComparativa(!modoComparativa)}
          >
            Comparar con otros jugadores
          </button>
          {!mostrarForm && (
            <button className="btn btn-primary btn-sm" onClick={abrirForm}>
              + Nueva evaluación
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarForm && (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="pf-form-row">
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="field">
              <label>Partido</label>
              <input
                value={partido}
                onChange={(e) => setPartido(e.target.value)}
                placeholder="Ej: Fecha 18 vs Boca"
                required
              />
            </div>
          </div>

          {PLANTILLA_INDICADORES.map(({ categoria, indicadores: nombres }) => (
            <div key={categoria} className="pf-categoria">
              <h4>{categoria}</h4>
              <div className="pf-indicadores-grid">
                {nombres.map((nombre) => {
                  const clave = `${categoria}|${nombre}`
                  return (
                    <div className="field" key={clave}>
                      <label>{nombre}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valores[clave] || ''}
                        onChange={onCambiarValor(clave)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="pf-categoria">
            <h4>Otros indicadores</h4>
            {extras.map((extra, i) => (
              <div className="pf-extra-row" key={i}>
                <input placeholder="Categoría (opcional)" value={extra.categoria} onChange={cambiarExtra(i, 'categoria')} />
                <input placeholder="Indicador" value={extra.indicador} onChange={cambiarExtra(i, 'indicador')} />
                <input
                  placeholder="Valor"
                  type="text"
                  inputMode="decimal"
                  value={extra.valor}
                  onChange={cambiarExtra(i, 'valor')}
                />
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => quitarExtra(i)}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={agregarExtra}>
              + Agregar indicador
            </button>
          </div>

          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar evaluación'}
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

      {!cargando && picos.length === 0 && (
        <p className="texto-muted">Todavía no hay evaluaciones cargadas para este jugador.</p>
      )}

      {!cargando && modoComparar && picosSeleccionados.length >= 2 && (
        <div className="pf-tabla-scroll">
          <table className="tabla pf-tabla-comparacion">
            <thead>
              <tr>
                <th>Indicador</th>
                {picosSeleccionados.map((p) => (
                  <th key={p.id}>
                    {formatFecha(p.fecha)} · {p.partido}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {indicadoresComparados.map((clave) => {
                const [categoria, indicador] = clave.split('|')
                return (
                  <tr key={clave}>
                    <td>
                      {indicador} <span className="texto-muted">({categoria})</span>
                    </td>
                    {picosSeleccionados.map((p) => {
                      const item = p.indicadores.find((i) => i.categoria === categoria && i.indicador === indicador)
                      return <td key={p.id}>{item ? item.valor : '—'}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && modoGrafico && clavesDisponibles.length === 0 && (
        <p className="texto-muted">Todavía no hay indicadores cargados para graficar.</p>
      )}

      {!cargando && modoGrafico && clavesDisponibles.length > 0 && (
        <div className="pf-grafico">
          <div className="field" style={{ maxWidth: 360 }}>
            <label>Indicador</label>
            <select value={claveActiva} onChange={(e) => setIndicadorGrafico(e.target.value)}>
              {Object.entries(indicadoresPorCategoria).map(([categoria, nombres]) => (
                <optgroup key={categoria} label={categoria}>
                  {Array.from(nombres).map((nombre) => (
                    <option key={`${categoria}|${nombre}`} value={`${categoria}|${nombre}`}>
                      {nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <GraficoTendencia puntos={puntosGrafico} etiqueta={indicadorActivo || ''} />
        </div>
      )}

      {!cargando && modoComparativa && clavesDisponibles.length === 0 && (
        <p className="texto-muted">Todavía no hay indicadores cargados para comparar.</p>
      )}

      {!cargando && modoComparativa && clavesDisponibles.length > 0 && (
        <div className="pf-grafico">
          <div className="pf-form-row">
            <div className="field" style={{ maxWidth: 300 }}>
              <label>Indicador</label>
              <select value={claveActiva} onChange={(e) => setIndicadorGrafico(e.target.value)}>
                {Object.entries(indicadoresPorCategoria).map(([categoria, nombres]) => (
                  <optgroup key={categoria} label={categoria}>
                    {Array.from(nombres).map((nombre) => (
                      <option key={`${categoria}|${nombre}`} value={`${categoria}|${nombre}`}>
                        {nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label>Agrupar por</label>
              <select value={periodoComparar} onChange={(e) => setPeriodoComparar(e.target.value)}>
                <option value="semana">Semana</option>
                <option value="quincena">Quincena</option>
                <option value="mes">Mes</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Comparar con</label>
            <div className="pf-roster-checks">
              {roster.map((j) => (
                <label key={j.id} className="pf-check">
                  <input
                    type="checkbox"
                    checked={jugadoresComparar.includes(j.id)}
                    onChange={() => toggleJugadorComparar(j.id)}
                  />
                  {j.nombre} {j.apellido}
                </label>
              ))}
              {roster.length === 0 && <span className="texto-muted">No hay otros jugadores cargados.</span>}
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={buscarComparativa}
            disabled={jugadoresComparar.length === 0 || cargandoComparativa}
          >
            {cargandoComparativa ? <span className="spinner" /> : 'Ver comparación'}
          </button>

          {comparativa && comparativa.periodos.length === 0 && (
            <p className="texto-muted" style={{ marginTop: 12 }}>
              No hay datos de este indicador para los jugadores elegidos.
            </p>
          )}

          {comparativa && comparativa.periodos.length > 0 && (
            <div className="pf-tabla-scroll" style={{ marginTop: 12 }}>
              <table className="tabla pf-tabla-comparacion">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    {comparativa.periodos.map((p) => (
                      <th key={p.clave}>{p.etiqueta}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparativa.jugadores.map((j) => (
                    <tr key={j.id}>
                      <td>{j.apellido}, {j.nombre}</td>
                      {comparativa.periodos.map((p) => (
                        <td key={p.clave}>{j.valores[p.clave] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!cargando && picos.length > 0 && (
        <div className="pf-picos-lista">
          {picos.map((p) => (
            <div key={p.id} className="pf-pico-item">
              <div className="pf-pico-header">
                {modoComparar && (
                  <input type="checkbox" checked={seleccionados.includes(p.id)} onChange={() => toggleSeleccionado(p.id)} />
                )}
                <strong>{formatFecha(p.fecha)}</strong>
                <span className="texto-muted">{p.partido}</span>
                <button
                  className="btn btn-ghost btn-sm btn-danger"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => eliminar(p)}
                >
                  Eliminar
                </button>
              </div>
              <div className="pf-pico-indicadores">
                {p.indicadores.map((ind, i) => (
                  <span key={i} className="pf-indicador-chip">
                    {ind.indicador}: <strong>{ind.valor}</strong>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatIA({ jugadorId }) {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const finRef = useRef(null)

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/chat-ia`)
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
      const { data } = await api.post(`/jugadores/${jugadorId}/chat-ia`, { mensaje })
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
      await api.delete(`/jugadores/${jugadorId}/chat-ia`)
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
        <h3>Chat con IA</h3>
        {mensajes.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={nuevaConversacion}>
            Nueva conversación
          </button>
        )}
      </div>

      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Preguntale sobre las cargas físicas de este jugador y las de su categoría: pensar entrenamientos,
        comparar, sacar conclusiones o pedir un archivo con datos puntuales.
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
              placeholder="Ej: ¿Cómo viene la distancia recorrida en los últimos partidos?"
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

// Portada de gráficos automáticos: se genera sola a partir de las cargas
// físicas cargadas (picos_rendimiento), independientemente de lo que
// escriba el preparador físico en el informe de texto de abajo.
function ResumenFisicoAutomatico({ jugadorId }) {
  const [picos, setPicos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/picos-rendimiento`)
      .then(({ data }) => setPicos(data))
      .finally(() => setCargando(false))
  }, [jugadorId])

  if (cargando) {
    return (
      <div className="card seccion" style={{ marginBottom: 16 }}>
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  if (picos.length === 0) {
    return (
      <div className="card seccion" style={{ marginBottom: 16 }}>
        <h3>Resumen automático</h3>
        <p className="texto-muted">
          Todavía no hay cargas físicas cargadas. Apenas se cargue la primera evaluación en "Cargas físicas", acá
          van a aparecer los gráficos solos.
        </p>
      </div>
    )
  }

  // picos viene ordenado DESC (más reciente primero, ver listarPicos).
  const ultima = picos[0]
  const anterior = picos[1]

  const chipsUltimaCarga = ultima.indicadores.map((ind) => {
    const previo = anterior?.indicadores.find((i) => i.categoria === ind.categoria && i.indicador === ind.indicador)
    const deltaPct = previo && previo.valor !== 0 ? ((ind.valor - previo.valor) / previo.valor) * 100 : null
    return { ...ind, deltaPct }
  })

  const picosAsc = [...picos].reverse()
  const graficos = PLANTILLA_INDICADORES.map(({ categoria, indicadores: nombres }) => {
    const indicador = nombres[0]
    const puntos = picosAsc
      .map((p) => ({
        fecha: p.fecha,
        valor: p.indicadores.find((i) => i.categoria === categoria && i.indicador === indicador)?.valor,
      }))
      .filter((p) => typeof p.valor === 'number')
    return { categoria, indicador, puntos }
  }).filter((g) => g.puntos.length >= 2)

  return (
    <div className="card seccion" style={{ marginBottom: 16 }}>
      <h3>Resumen automático</h3>
      <p className="texto-muted" style={{ marginBottom: 14 }}>
        Generado a partir de las cargas físicas cargadas — independiente del informe que se escriba abajo.
      </p>

      <p className="texto-muted" style={{ marginBottom: 8 }}>
        Última carga: {formatFecha(ultima.fecha)} · {ultima.partido}
        {anterior && ' (variación respecto a la carga anterior)'}
      </p>
      <div className="pf-resumen-chips">
        {chipsUltimaCarga.map((c, i) => (
          <div key={i} className="pf-resumen-chip">
            <span className="texto-muted">{c.indicador}</span>
            <strong>{c.valor}</strong>
            {c.deltaPct !== null && (
              <span className="pf-resumen-delta">
                {c.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(c.deltaPct).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {graficos.length > 0 && (
        <div className="pf-resumen-graficos">
          {graficos.map((g) => (
            <div key={g.categoria} className="pf-resumen-grafico-item">
              <h4>{g.indicador}</h4>
              <GraficoTendencia puntos={g.puntos} etiqueta={g.indicador} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InformeFisico({ jugadorId }) {
  const [informe, setInforme] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ fortalezas: '', debilidades: '', aspectos_mantener: '', aspectos_mejorar: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/informe-fisico`)
      .then(({ data }) => setInforme(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const empezarEdicion = () => {
    setForm({
      fortalezas: informe?.fortalezas || '',
      debilidades: informe?.debilidades || '',
      aspectos_mantener: informe?.aspectos_mantener || '',
      aspectos_mejorar: informe?.aspectos_mejorar || '',
    })
    setError('')
    setEditando(true)
  }

  const onChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await api.put(`/jugadores/${jugadorId}/informe-fisico`, form)
      setEditando(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el informe físico'))
    } finally {
      setEnviando(false)
    }
  }

  const tieneContenido =
    informe && (informe.fortalezas || informe.debilidades || informe.aspectos_mantener || informe.aspectos_mejorar)

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Informe físico (portada)</h3>
        {!editando && !cargando && (
          <button className="btn btn-ghost btn-sm" onClick={empezarEdicion}>
            {tieneContenido ? 'Editar' : '+ Completar'}
          </button>
        )}
      </div>

      <p className="texto-muted" style={{ marginBottom: 12 }}>
        Informe único y permanente: presentación física del jugador. Se actualiza siempre en el
        mismo lugar, no genera historial.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando ? (
        <div className="empty-state">
          <span className="spinner spinner-dark" />
        </div>
      ) : !editando ? (
        tieneContenido ? (
          <div>
            <div className="pf-texto-libre">
              <dt>Fortalezas</dt>
              <dd>{informe.fortalezas || <span className="texto-muted">—</span>}</dd>
            </div>
            <div className="pf-texto-libre">
              <dt>Debilidades</dt>
              <dd>{informe.debilidades || <span className="texto-muted">—</span>}</dd>
            </div>
            <div className="pf-texto-libre">
              <dt>Aspectos a mantener</dt>
              <dd>{informe.aspectos_mantener || <span className="texto-muted">—</span>}</dd>
            </div>
            <div className="pf-texto-libre">
              <dt>Aspectos a mejorar</dt>
              <dd>{informe.aspectos_mejorar || <span className="texto-muted">—</span>}</dd>
            </div>
          </div>
        ) : (
          <p className="texto-muted">Todavía no se cargó el informe físico de este jugador.</p>
        )
      ) : (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="field">
            <label>Fortalezas</label>
            <textarea rows={3} value={form.fortalezas} onChange={onChange('fortalezas')} />
          </div>
          <div className="field">
            <label>Debilidades</label>
            <textarea rows={3} value={form.debilidades} onChange={onChange('debilidades')} />
          </div>
          <div className="field">
            <label>Aspectos a mantener</label>
            <textarea rows={3} value={form.aspectos_mantener} onChange={onChange('aspectos_mantener')} />
          </div>
          <div className="field">
            <label>Aspectos a mejorar</label>
            <textarea rows={3} value={form.aspectos_mejorar} onChange={onChange('aspectos_mejorar')} />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function EntrenamientosExtra({ jugadorId }) {
  const [planes, setPlanes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [fecha, setFecha] = useState('')
  const [informe, setInforme] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [planAbierto, setPlanAbierto] = useState(null)

  const token = localStorage.getItem('token')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/planes-entrenamiento-extra`)
      .then(({ data }) => setPlanes(data))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const abrirForm = () => {
    setFecha(new Date().toISOString().slice(0, 10))
    setInforme('')
    setArchivo(null)
    setError('')
    setMostrarForm(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')

    if (!fecha) {
      setError('La fecha es obligatoria')
      return
    }

    setEnviando(true)
    try {
      const datos = new FormData()
      datos.append('fecha', fecha)
      if (informe) datos.append('informe', informe)
      if (archivo) datos.append('archivo', archivo)
      await api.post(`/jugadores/${jugadorId}/planes-entrenamiento-extra`, datos)
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo registrar el plan'))
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (plan) => {
    if (!window.confirm(`¿Eliminar el plan del ${formatFecha(plan.fecha)}?`)) {
      return
    }

    try {
      await api.delete(`/jugadores/${jugadorId}/planes-entrenamiento-extra/${plan.id}`)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el plan'))
    }
  }

  return (
    <div className="card seccion">
      <div className="seccion-header">
        <h3>Entrenamientos extra</h3>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={abrirForm}>
            + Nuevo plan
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {mostrarForm && (
        <form className="form-edicion" onSubmit={guardar}>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div className="field">
            <label>Archivo (PDF, imagen o Word, opcional)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setArchivo(e.target.files[0] || null)}
            />
          </div>
          <div className="field">
            <label>Informe</label>
            <textarea
              rows={4}
              value={informe}
              onChange={(e) => setInforme(e.target.value)}
              placeholder="Por qué se eligió este plan, en qué se enfoca, etc."
            />
          </div>
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar plan'}
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

      {!cargando && planes.length === 0 && (
        <p className="texto-muted">Todavía no hay planes de entrenamiento extra cargados.</p>
      )}

      {!cargando && planes.length > 0 && (
        <div className="cf-lista">
          {planes.map((p) => (
            <div className="cf-item-wrap" key={p.id}>
              <div className="cf-item">
                <div className="cf-item-info">
                  <strong>Plan del {formatFecha(p.fecha)}</strong>
                  {p.informe && <span className="texto-muted">{p.informe}</span>}
                </div>
                <div className="cf-item-acciones">
                  {p.nombre_archivo && (
                    <a
                      className="btn btn-ghost btn-sm"
                      href={`${API_BASE}/api/jugadores/${jugadorId}/planes-entrenamiento-extra/${p.id}/archivo?token=${token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver archivo ↗
                    </a>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPlanAbierto(planAbierto === p.id ? null : p.id)}
                  >
                    {planAbierto === p.id ? 'Ocultar seguimiento' : 'Ver seguimiento'}
                  </button>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => eliminar(p)}>
                    Eliminar
                  </button>
                </div>
              </div>
              {planAbierto === p.id && <SeguimientoPlanStaff planId={p.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Seguimiento que cargó el jugador para un plan puntual (peso, duración,
// horario, observaciones) — de solo lectura para el cuerpo técnico.
function SeguimientoPlanStaff({ planId }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    api
      .get(`/jugadores/planes-entrenamiento-extra/${planId}/registros`)
      .then(({ data }) => setRegistros(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el seguimiento')))
      .finally(() => setCargando(false))
  }, [planId])

  if (cargando) {
    return (
      <div className="empty-state">
        <span className="spinner spinner-dark" />
      </div>
    )
  }

  if (error) return <div className="alert alert-error">{error}</div>

  if (registros.length === 0) {
    return <p className="texto-muted cf-seguimiento">El jugador todavía no registró seguimiento de este plan.</p>
  }

  return (
    <div className="cf-seguimiento">
      <div className="tabla-scroll">
        <table className="tabla tabla-compacta">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso (kg)</th>
              <th>Duración (min)</th>
              <th>Horario</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id}>
                <td>{formatFecha(r.fecha)}</td>
                <td>{r.peso_kg ?? '—'}</td>
                <td>{r.duracion_min ?? '—'}</td>
                <td>{r.horario || '—'}</td>
                <td className="texto-muted">{r.observaciones || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
