import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import MenuSeccionesJugador from '../components/MenuSeccionesJugador'
import NutricionTabs from '../components/NutricionTabs'
import VistaPlanAlimentacion from '../components/VistaPlanAlimentacion'
import './AdminJugadorDetalle.css'
import './JugadorNutricion.css'

let idSeq = 1
const nuevaSeccion = () => ({ id: `sec-${Date.now()}-${idSeq++}`, titulo: '', texto: '', imagen_url: '' })

export default function JugadorNutricionDieta() {
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
        <h1>Nutrición del jugador{jugadorNombre ? ` — ${jugadorNombre}` : ''}</h1>
        <MenuSeccionesJugador jugadorId={id} jugadorNombre={jugadorNombre} activa="nutricion" />
      </div>

      <NutricionTabs jugadorId={id} activa="dieta" />

      <PlanAlimentacion jugadorId={id} />
    </div>
  )
}

function PlanAlimentacion({ jugadorId }) {
  const [dieta, setDieta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState('armado')
  const [secciones, setSecciones] = useState([])
  const [archivoNuevo, setArchivoNuevo] = useState(null)
  const [subiendoImagenId, setSubiendoImagenId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const token = localStorage.getItem('token')
  const archivoHref = `${API_BASE}/api/jugadores/${jugadorId}/dieta/archivo?token=${token}`

  const cargar = () => {
    setCargando(true)
    api
      .get(`/jugadores/${jugadorId}/dieta`)
      .then(({ data }) => setDieta(data))
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el plan de alimentación')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [jugadorId])

  const empezarEdicion = () => {
    setModoEdicion(dieta?.modo === 'archivo' ? 'archivo' : 'armado')
    setSecciones(dieta?.secciones?.length ? dieta.secciones : [nuevaSeccion()])
    setArchivoNuevo(null)
    setError('')
    setMensaje('')
    setEditando(true)
  }

  const cambiarSeccion = (id, cambios) =>
    setSecciones((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)))

  const agregarSeccion = () => setSecciones((prev) => [...prev, nuevaSeccion()])

  const eliminarSeccion = (id) => {
    if (secciones.length <= 1) return
    setSecciones((prev) => prev.filter((s) => s.id !== id))
  }

  const moverSeccion = (index, direccion) => {
    const destino = index + direccion
    if (destino < 0 || destino >= secciones.length) return
    setSecciones((prev) => {
      const copia = [...prev]
      ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
      return copia
    })
  }

  const subirImagen = async (id, archivo) => {
    setSubiendoImagenId(id)
    setError('')
    try {
      const datos = new FormData()
      datos.append('imagen', archivo)
      const { data } = await api.post(`/jugadores/${jugadorId}/dieta/imagen`, datos)
      cambiarSeccion(id, { imagen_url: data.url })
    } catch (err) {
      setError(extraerError(err, 'No se pudo subir la imagen'))
    } finally {
      setSubiendoImagenId(null)
    }
  }

  const guardarArmado = async (e) => {
    e.preventDefault()
    setError('')

    const secccionesValidas = secciones.filter((s) => s.titulo.trim())
    if (secccionesValidas.length === 0) {
      setError('Agregá al menos una sección con título')
      return
    }

    setGuardando(true)
    try {
      await api.put(`/jugadores/${jugadorId}/dieta`, { secciones: secccionesValidas })
      setMensaje('Plan de alimentación guardado correctamente')
      setEditando(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el plan de alimentación'))
    } finally {
      setGuardando(false)
    }
  }

  const guardarArchivo = async (e) => {
    e.preventDefault()
    setError('')

    if (!archivoNuevo) {
      setError('Subí el archivo del plan de alimentación')
      return
    }

    setGuardando(true)
    try {
      const datos = new FormData()
      datos.append('archivo', archivoNuevo)
      await api.post(`/jugadores/${jugadorId}/dieta/archivo`, datos)
      setMensaje('Plan de alimentación guardado correctamente')
      setEditando(false)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar el plan de alimentación'))
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="empty-state">
        <span className="spinner spinner-dark" />
      </div>
    )
  }

  return (
    <div className="card seccion nutricion-card">
      <div className="seccion-header">
        <h3>Plan de alimentación individual</h3>
        {!editando && (
          <button className="btn btn-primary btn-sm" onClick={empezarEdicion}>
            {dieta?.modo ? 'Editar' : '+ Crear plan'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && !editando && <div className="alert alert-success">{mensaje}</div>}

      {!editando ? (
        <VistaPlanAlimentacion dieta={dieta} archivoHref={archivoHref} />
      ) : (
        <>
          <div className="modo-toggle" style={{ marginTop: 12, marginBottom: 16 }}>
            <button
              type="button"
              className={`btn btn-sm ${modoEdicion === 'armado' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setModoEdicion('armado')}
            >
              Armar en la app
            </button>
            <button
              type="button"
              className={`btn btn-sm ${modoEdicion === 'archivo' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setModoEdicion('archivo')}
            >
              Subir archivo
            </button>
          </div>

          {modoEdicion === 'armado' ? (
            <form className="form-edicion" onSubmit={guardarArmado}>
              <div className="pa-secciones">
                {secciones.map((s, i) => (
                  <div className="card pa-seccion-editor" key={s.id}>
                    <div className="pa-seccion-editor-header">
                      <span className="pa-seccion-numero">{i + 1}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => moverSeccion(i, -1)} disabled={i === 0}>
                          ◀
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => moverSeccion(i, 1)}
                          disabled={i === secciones.length - 1}
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger"
                          onClick={() => eliminarSeccion(s.id)}
                          disabled={secciones.length <= 1}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="field">
                      <label>Título</label>
                      <input
                        value={s.titulo}
                        onChange={(e) => cambiarSeccion(s.id, { titulo: e.target.value })}
                        placeholder="Ej: Desayuno / Merienda"
                      />
                    </div>

                    <div className="field">
                      <label>Imagen (opcional)</label>
                      {s.imagen_url && <img src={s.imagen_url} alt="" className="pa-imagen-preview" />}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && subirImagen(s.id, e.target.files[0])}
                        disabled={subiendoImagenId === s.id}
                      />
                      {subiendoImagenId === s.id && <span className="spinner" />}
                    </div>

                    <div className="field">
                      <label>Texto</label>
                      <textarea
                        rows={6}
                        value={s.texto}
                        onChange={(e) => cambiarSeccion(s.id, { texto: e.target.value })}
                        placeholder="Comidas, porciones, opciones..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-ghost btn-sm" onClick={agregarSeccion} style={{ marginTop: 12 }}>
                + Agregar sección
              </button>

              <div className="form-edicion-botones" style={{ marginTop: 16 }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={guardando}>
                  {guardando ? <span className="spinner" /> : 'Guardar plan'}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <form className="form-edicion" onSubmit={guardarArchivo}>
              <div className="field">
                <label>Archivo del plan (PDF, Word o imagen)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setArchivoNuevo(e.target.files[0] || null)}
                />
              </div>
              <div className="form-edicion-botones">
                <button className="btn btn-primary btn-sm" type="submit" disabled={guardando}>
                  {guardando ? <span className="spinner" /> : 'Guardar plan'}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
