import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { API_BASE, extraerError } from '../api/client'
import EscudoClub from '../components/EscudoClub'
import PizarraTactica from '../components/pizarra/PizarraTactica'
import EditorTexto from '../components/EditorTexto'
import YouTubePlayer from '../components/YouTubePlayer'
import { extraerIdYouTube } from '../utils/youtube'
import './EjercicioDetalle.css'

const ETIQUETAS_CATEGORIA = {
  rondos: 'Rondos',
  pelota_parada: 'Pelota parada',
  preestablecido: 'Preestablecido',
  ruta_de_pases: 'Ruta de pases',
  especifico_ofensivo: 'Específico ofensivo',
  especifico_defensivo: 'Específico defensivo',
  posesiones: 'Posesiones',
  salidas_progresivas: 'Salidas progresivas',
  ejercicios_individuales: 'Ejercicios individuales',
}

const CONTENIDO_VACIO = { objetivo: '', reglas: '', coaching: '' }
const LIMITE_TITULO = 150

// Ficha completa de un ejercicio de "Entrenamientos Desglosados" (biblioteca
// por categorías): nombre, contenido estructurado, pizarra táctica con
// animación por escenas, video real. Se llega acá desde la lista por
// categoría (EjerciciosTacticos.jsx) al crear o abrir un ejercicio.
export default function EjercicioTacticoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [ejercicio, setEjercicio] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [cantidadJugadores, setCantidadJugadores] = useState('')
  const [duracionMinutos, setDuracionMinutos] = useState('')
  const [contenido, setContenido] = useState(CONTENIDO_VACIO)
  const [dibujo, setDibujo] = useState(null)
  const [modoPizarra, setModoPizarra] = useState('dibujo')
  const [archivoPizarra, setArchivoPizarra] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = () => {
    setCargando(true)
    api
      .get(`/ejercicios-tacticos/${id}`)
      .then(({ data }) => {
        setEjercicio(data)
        setTitulo(data.titulo || '')
        setFecha(data.fecha ? String(data.fecha).slice(0, 10) : '')
        setCantidadJugadores(data.cantidad_jugadores ?? '')
        setDuracionMinutos(data.duracion_minutos ?? '')
        setContenido(
          data.contenido_json || (data.descripcion ? { ...CONTENIDO_VACIO, objetivo: `<p>${data.descripcion}</p>` } : CONTENIDO_VACIO)
        )
        setDibujo(data.dibujo_json || null)
        setModoPizarra(data.pizarra_modo || 'dibujo')
        setArchivoPizarra(null)
      })
      .catch((err) => setError(extraerError(err, 'No se pudo cargar el ejercicio')))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [id])

  const guardar = async () => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const datos = new FormData()
      datos.append('titulo', titulo || '')
      datos.append('fecha', fecha || '')
      datos.append('cantidad_jugadores', cantidadJugadores || '')
      datos.append('duracion_minutos', duracionMinutos || '')
      datos.append('contenido_json', JSON.stringify(contenido))
      if (modoPizarra === 'archivo' && archivoPizarra) {
        datos.append('pizarra_archivo', archivoPizarra)
      } else if (modoPizarra === 'dibujo' && dibujo) {
        datos.append('dibujo_json', JSON.stringify(dibujo))
      }
      await api.put(`/ejercicios-tacticos/${id}`, datos)
      setMensaje('Guardado correctamente')
      setTimeout(() => setMensaje(''), 2500)
      cargar()
    } catch (err) {
      setError(extraerError(err, 'No se pudo guardar'))
    } finally {
      setGuardando(false)
    }
  }

  const [duplicando, setDuplicando] = useState(false)
  const duplicar = async () => {
    setDuplicando(true)
    setError('')
    try {
      const { data } = await api.post(`/ejercicios-tacticos/${id}/duplicar`)
      navigate(`/entrenamientos/ejercicios-tacticos/${data.id}`)
    } catch (err) {
      setError(extraerError(err, 'No se pudo duplicar el ejercicio'))
      setDuplicando(false)
    }
  }

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este ejercicio? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/ejercicios-tacticos/${id}`)
      navigate('/entrenamientos')
    } catch (err) {
      setError(extraerError(err, 'No se pudo eliminar el ejercicio'))
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

  if (error && !ejercicio) {
    return (
      <div className="page">
        <Link to="/entrenamientos" className="btn btn-ghost btn-sm">← Volver a Entrenamientos desglosados</Link>
        <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
      </div>
    )
  }

  const etiquetaCategoria = ejercicio.subcategoria || ETIQUETAS_CATEGORIA[ejercicio.categoria] || ejercicio.categoria

  return (
    <div className="page ejercicio-page">
      <Link to="/entrenamientos" className="btn btn-ghost btn-sm">← Volver a Entrenamientos desglosados</Link>

      <div className="ej-hoja">
        <div className="ej-header">
          <div className="ej-header-club">
            <EscudoClub size={44} />
            <div>
              <strong>CLUB ATLÉTICO LANÚS</strong>
              <span>ENTRENAMIENTOS DESGLOSADOS · CUERPO TÉCNICO</span>
            </div>
          </div>
          <div className="ej-header-datos">
            <div className="ej-header-numero">{etiquetaCategoria}</div>
            <div className="ej-header-campo">
              <label>Día:</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="ej-fila ej-fila-nombre">
          <div className="ej-campo ej-campo-nombre">
            <label>Nombre del ejercicio:</label>
            <input value={titulo} maxLength={LIMITE_TITULO} onChange={(e) => setTitulo(e.target.value)} />
            <span className="ej-contador">{LIMITE_TITULO - titulo.length} caracteres restantes</span>
          </div>
          <div className="ej-header-acciones">
            <button className="btn btn-ghost btn-sm" onClick={duplicar} disabled={duplicando}>
              {duplicando ? <span className="spinner" /> : 'Duplicar'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={guardar} disabled={guardando}>
              {guardando ? <span className="spinner" /> : 'Guardar'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {mensaje && <div className="alert alert-success">{mensaje}</div>}

        <div className="ej-fila ej-fila-2">
          <div className="ej-campo">
            <label>Cantidad de jugadores:</label>
            <input type="text" inputMode="numeric" value={cantidadJugadores} onChange={(e) => setCantidadJugadores(e.target.value)} />
          </div>
          <div className="ej-campo">
            <label>Duración (minutos):</label>
            <input type="number" min={0} value={duracionMinutos} onChange={(e) => setDuracionMinutos(e.target.value)} />
          </div>
        </div>

        <div className="ej-cuerpo">
          <div className="ej-texto-col">
            <div className="ej-campo ej-campo-grande">
              <label>Objetivo:</label>
              <EditorTexto value={contenido.objetivo} onChange={(html) => setContenido({ ...contenido, objetivo: html })} placeholder="¿Qué se busca entrenar con este ejercicio?" />
            </div>
            <div className="ej-campo ej-campo-grande">
              <label>Reglas:</label>
              <EditorTexto value={contenido.reglas} onChange={(html) => setContenido({ ...contenido, reglas: html })} placeholder="Formación, jugadores neutrales, reglas especiales..." />
            </div>
            <div className="ej-campo ej-campo-grande">
              <label>Puntos de coaching:</label>
              <EditorTexto value={contenido.coaching} onChange={(html) => setContenido({ ...contenido, coaching: html })} placeholder="Indicaciones clave para el entrenador" />
            </div>

            <VideoRealEjercicioTactico ejercicioId={id} ejercicio={ejercicio} onCambio={cargar} />

            {ejercicio.animacion_video_url && (
              <div className="ej-campo ej-campo-grande">
                <label>Animación táctica generada:</label>
                <video className="video-player" controls preload="metadata" src={`${API_BASE}/api/ejercicios-tacticos/${id}/animacion-archivo?token=${token}`} />
              </div>
            )}
          </div>

          <div className="ej-cancha-col">
            <div className="modo-toggle" style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={`btn btn-sm ${modoPizarra === 'dibujo' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setModoPizarra('dibujo')}
              >
                Dibujar pizarra
              </button>
              <button
                type="button"
                className={`btn btn-sm ${modoPizarra === 'archivo' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setModoPizarra('archivo')}
              >
                Subir imagen o video
              </button>
            </div>

            {modoPizarra === 'dibujo' ? (
              <PizarraTactica value={dibujo} onChange={setDibujo} editable ejercicioId={id} />
            ) : (
              <div className="field">
                <label>Imagen o video de la pizarra</label>
                <input type="file" accept="image/*,video/*" onChange={(e) => setArchivoPizarra(e.target.files[0] || null)} />
                {archivoPizarra ? (
                  <span className="texto-muted">{archivoPizarra.name}</span>
                ) : ejercicio.pizarra_modo === 'archivo' ? (
                  ejercicio.pizarra_archivo_tipo === 'imagen' ? (
                    <img className="et-pizarra-imagen" src={`${API_BASE}/api/ejercicios-tacticos/${id}/pizarra-archivo?token=${token}`} alt="Pizarra táctica" />
                  ) : (
                    <video className="video-player" controls preload="metadata" src={`${API_BASE}/api/ejercicios-tacticos/${id}/pizarra-archivo?token=${token}`} />
                  )
                ) : (
                  <span className="texto-muted">Todavía no se subió ningún archivo de pizarra.</span>
                )}
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setArchivoPizarra(null)}>
                  Quitar/reemplazar diagrama
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ej-acciones">
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? <span className="spinner" /> : 'Guardar'}
        </button>
        <button className="btn btn-ghost btn-danger" onClick={eliminar}>
          Eliminar ejercicio
        </button>
      </div>
    </div>
  )
}

// Video real (archivo o link), guardado directamente en la fila del
// ejercicio (no en la tabla compartida "videos" — a diferencia de los
// ejercicios de sesión). Un solo video por ejercicio, se reemplaza al subir
// otro.
function VideoRealEjercicioTactico({ ejercicioId, ejercicio, onCambio }) {
  const [mostrarForm, setMostrarForm] = useState(!ejercicio.video_tipo)
  const [modo, setModo] = useState('archivo')
  const [archivo, setArchivo] = useState(null)
  const [urlVideo, setUrlVideo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const token = localStorage.getItem('token')

  const subir = async (e) => {
    e.preventDefault()
    setError('')
    if (modo === 'archivo' && !archivo) {
      setError('Elegí un archivo de video')
      return
    }
    if (modo === 'link' && !urlVideo.trim()) {
      setError('Pegá un link de video')
      return
    }
    setEnviando(true)
    try {
      const datos = new FormData()
      if (modo === 'archivo') datos.append('video', archivo)
      else datos.append('url_video', urlVideo)
      await api.put(`/ejercicios-tacticos/${ejercicioId}`, datos)
      setArchivo(null)
      setUrlVideo('')
      setMostrarForm(false)
      onCambio()
    } catch (err) {
      setError(extraerError(err, 'No se pudo agregar el video'))
    } finally {
      setEnviando(false)
    }
  }

  const idYouTube = ejercicio.video_tipo === 'link' ? extraerIdYouTube(ejercicio.video_url) : null

  return (
    <div className="ej-campo ej-campo-grande">
      <div className="ej-video-header">
        <label style={{ marginBottom: 0 }}>Video real del ejercicio:</label>
        {!mostrarForm && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrarForm(true)}>
            {ejercicio.video_tipo ? 'Reemplazar video' : '+ Agregar video'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!mostrarForm && !ejercicio.video_tipo && <p className="texto-muted">Todavía no se cargó un video real de este ejercicio.</p>}

      {!mostrarForm && ejercicio.video_tipo === 'archivo' && (
        <video className="video-player" controls preload="metadata" src={`${API_BASE}/api/ejercicios-tacticos/${ejercicioId}/archivo?token=${token}`} />
      )}
      {!mostrarForm && ejercicio.video_tipo === 'link' && (idYouTube ? (
        <YouTubePlayer videoId={idYouTube} />
      ) : (
        <a className="btn btn-ghost btn-sm" href={ejercicio.video_url} target="_blank" rel="noreferrer">Ver video externo ↗</a>
      ))}

      {mostrarForm && (
        <form className="form-video" onSubmit={subir} style={{ marginTop: 12 }}>
          <div className="modo-toggle">
            <button type="button" className={`btn btn-sm ${modo === 'archivo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setModo('archivo')}>Subir archivo</button>
            <button type="button" className={`btn btn-sm ${modo === 'link' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setModo('link')}>Link externo</button>
          </div>
          {modo === 'archivo' ? (
            <div className="field">
              <input type="file" accept="video/*" onChange={(e) => setArchivo(e.target.files[0] || null)} />
              {archivo && <span className="texto-muted">{archivo.name}</span>}
            </div>
          ) : (
            <div className="field">
              <input value={urlVideo} onChange={(e) => setUrlVideo(e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div className="form-edicion-botones">
            <button className="btn btn-primary btn-sm" type="submit" disabled={enviando}>
              {enviando ? <span className="spinner" /> : 'Guardar video'}
            </button>
            {ejercicio.video_tipo && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarForm(false)}>Cancelar</button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
