import { useEffect, useRef, useState } from 'react'
import CampoLienzo, { ANCHO, CAMPOS } from './CampoLienzo'
import useVideoRecorder, { soportaGrabacion } from './useVideoRecorder'
import { escenaInterpolada, duracionTotalMs } from './interpolarEscenas'
import './AnimacionPanel.css'

/**
 * Modal "Exportar animación": arma la reproducción de la secuencia de
 * escenas (fotogramas clave) y exporta el resultado como Imagen (descarga
 * local del frame actual, sin backend) o Video (graba y sube, sección 6 de
 * la spec original). Las escenas en sí (crear/duplicar/eliminar/reordenar)
 * se manejan desde EscenasTimeline, debajo de la cancha; este panel es
 * solo reproducción + exportación.
 */
export default function AnimacionPanel({ escenas, campo, onCerrar, ejercicioId, endpointBase, patronCesped }) {
  const alto = CAMPOS[campo.tipo]?.alto ?? CAMPOS.completa.alto
  const [escenaMostrada, setEscenaMostrada] = useState(escenas[0])
  const [reproduciendo, setReproduciendo] = useState(false)
  const previewRafRef = useRef(null)
  const stageRef = useRef(null)
  const canvasCapturaRef = useRef(null)

  const duracionTotal = duracionTotalMs(escenas)

  const [nombreArchivo, setNombreArchivo] = useState(`animacion-ejercicio-${ejercicioId || ''}`)
  const [formato, setFormato] = useState('video') // 'video' | 'imagen'
  const [calidad, setCalidad] = useState('alta') // 'baja' | 'alta'
  const pixelRatio = calidad === 'alta' ? 2 : 1

  const detenerPreview = () => {
    if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current)
    previewRafRef.current = null
    setReproduciendo(false)
  }

  const reproducirPreview = () => {
    detenerPreview()
    setReproduciendo(true)
    const inicio = performance.now()
    const tick = (ahora) => {
      const t = ahora - inicio
      if (t >= duracionTotal) {
        setEscenaMostrada(escenas[escenas.length - 1])
        setReproduciendo(false)
        return
      }
      setEscenaMostrada(escenaInterpolada(escenas, t))
      previewRafRef.current = requestAnimationFrame(tick)
    }
    previewRafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => detenerPreview(), [])

  const { grabando, progresoMs, subiendo, error, generarYSubir } = useVideoRecorder({
    escenas,
    stageRef,
    canvasCapturaRef,
    onFrame: setEscenaMostrada,
    endpointBase,
    pixelRatio,
    nombreArchivo,
  })

  const [resultado, setResultado] = useState(null)

  const convertirEnVideo = async () => {
    setResultado(null)
    try {
      await generarYSubir(ejercicioId)
      setResultado('ok')
    } catch {
      setResultado('error')
    }
  }

  const exportarComoImagen = () => {
    if (!stageRef.current) return
    const uri = stageRef.current.toDataURL({ pixelRatio })
    const link = document.createElement('a')
    link.download = `${nombreArchivo || 'pizarra-tactica'}.png`
    link.href = uri
    link.click()
    setResultado('ok')
  }

  const exportando = grabando || subiendo
  const puedeExportar = formato === 'imagen' || (escenas.length >= 2 && soportaGrabacion())

  const exportar = () => (formato === 'imagen' ? exportarComoImagen() : convertirEnVideo())

  return (
    <div className="animacion-overlay" onClick={onCerrar}>
      <div className="animacion-panel" onClick={(e) => e.stopPropagation()}>
        <div className="animacion-header">
          <h3>Exportar animación</h3>
          <div className="animacion-header-botones">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCerrar}>Cancelar</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={exportar} disabled={!puedeExportar || exportando}>
              {grabando
                ? `Generando… ${(progresoMs / 1000).toFixed(1)}s / ${(duracionTotal / 1000).toFixed(1)}s`
                : subiendo
                ? 'Subiendo…'
                : 'Exportar'}
            </button>
          </div>
        </div>

        <div className="animacion-cuerpo">
          <div className="animacion-cover">
            <div className="animacion-preview-wrap" style={{ maxWidth: ANCHO }}>
              <CampoLienzo stageRef={stageRef} escena={escenaMostrada} campo={campo} editable={false} patronCesped={patronCesped} />
            </div>
            {/* Canvas oculto: acá se compone cada frame (fusión del stage de
                arriba) para que MediaRecorder lo capture vía captureStream. */}
            <canvas ref={canvasCapturaRef} width={ANCHO} height={alto} style={{ display: 'none' }} />

            <div className="animacion-controles">
              <button type="button" className="btn btn-ghost btn-sm" onClick={reproducirPreview} disabled={reproduciendo || grabando || escenas.length < 2}>
                {reproduciendo ? '▶ Reproduciendo…' : '▶ Vista previa'}
              </button>
              {reproduciendo && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={detenerPreview}>⏸ Detener</button>
              )}
            </div>
          </div>

          <div className="animacion-opciones">
            <div className="animacion-campo">
              <label>Nombre de archivo</label>
              <input type="text" value={nombreArchivo} onChange={(e) => setNombreArchivo(e.target.value)} />
            </div>

            <div className="animacion-campo">
              <label>Formato</label>
              <div className="animacion-chips">
                <button type="button" className={`animacion-chip ${formato === 'imagen' ? 'activo' : ''}`} onClick={() => setFormato('imagen')}>Imagen</button>
                <button type="button" className={`animacion-chip ${formato === 'video' ? 'activo' : ''}`} onClick={() => setFormato('video')}>Video</button>
              </div>
            </div>

            <div className="animacion-campo">
              <label>Calidad</label>
              <div className="animacion-chips">
                <button type="button" className={`animacion-chip ${calidad === 'baja' ? 'activo' : ''}`} onClick={() => setCalidad('baja')}>Baja</button>
                <button type="button" className={`animacion-chip ${calidad === 'alta' ? 'activo' : ''}`} onClick={() => setCalidad('alta')}>Alta</button>
              </div>
            </div>

            {formato === 'video' && (
              <p className="texto-muted">
                {escenas.length} escena{escenas.length !== 1 ? 's' : ''} · duración total aprox. {(duracionTotal / 1000).toFixed(1)}s
              </p>
            )}

            {formato === 'video' && !soportaGrabacion() && (
              <p className="animacion-error">Este navegador no puede generar video (probá con Chrome o Edge de escritorio).</p>
            )}
            {formato === 'video' && escenas.length < 2 && (
              <p className="texto-muted">Agregá al menos una segunda escena en la línea de tiempo para poder generar una animación.</p>
            )}

            {resultado === 'ok' && (
              <p className="animacion-ok">{formato === 'imagen' ? 'Imagen descargada.' : 'Video generado y guardado en el ejercicio.'}</p>
            )}
            {(resultado === 'error' || error) && <p className="animacion-error">{error || 'No se pudo generar el video.'}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
