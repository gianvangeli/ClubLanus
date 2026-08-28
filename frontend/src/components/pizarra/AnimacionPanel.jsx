import { useEffect, useRef, useState } from 'react'
import CampoLienzo, { ANCHO, CAMPOS } from './CampoLienzo'
import useVideoRecorder, { soportaGrabacion } from './useVideoRecorder'
import { escenaInterpolada, duracionTotalMs } from './interpolarEscenas'
import './AnimacionPanel.css'

/**
 * Drawer "Editar animación": arma la reproducción de la secuencia de
 * escenas (fotogramas clave) y dispara "Convertir en video" — la única
 * forma de generar movimiento (sección 6 de la spec). Las escenas en sí
 * (crear/duplicar/eliminar/reordenar) se manejan desde EscenasTimeline,
 * debajo de la cancha; este panel es solo reproducción + exportación.
 */
export default function AnimacionPanel({ escenas, campo, onCerrar, ejercicioId }) {
  const alto = CAMPOS[campo.tipo]?.alto ?? CAMPOS.completa.alto
  const [escenaMostrada, setEscenaMostrada] = useState(escenas[0])
  const [reproduciendo, setReproduciendo] = useState(false)
  const previewRafRef = useRef(null)
  const stageRef = useRef(null)
  const canvasCapturaRef = useRef(null)

  const duracionTotal = duracionTotalMs(escenas)

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

  return (
    <div className="animacion-overlay" onClick={onCerrar}>
      <div className="animacion-panel" onClick={(e) => e.stopPropagation()}>
        <div className="animacion-header">
          <h3>Editar animación</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onCerrar}>✕</button>
        </div>

        <p className="texto-muted">
          {escenas.length} escena{escenas.length !== 1 ? 's' : ''} · duración total aprox. {(duracionTotal / 1000).toFixed(1)}s
        </p>

        <div className="animacion-preview-wrap" style={{ maxWidth: ANCHO }}>
          <CampoLienzo stageRef={stageRef} escena={escenaMostrada} campo={campo} editable={false} />
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

        {!soportaGrabacion() && (
          <p className="animacion-error">Este navegador no puede generar video (probá con Chrome o Edge de escritorio).</p>
        )}

        {escenas.length < 2 && (
          <p className="texto-muted">Agregá al menos una segunda escena en la línea de tiempo para poder generar una animación.</p>
        )}

        <button
          type="button"
          className="btn btn-primary animacion-convertir"
          onClick={convertirEnVideo}
          disabled={grabando || subiendo || escenas.length < 2 || !soportaGrabacion()}
        >
          {grabando
            ? `Generando video… ${(progresoMs / 1000).toFixed(1)}s / ${(duracionTotal / 1000).toFixed(1)}s`
            : subiendo
            ? 'Subiendo…'
            : 'Convertir en video'}
        </button>

        {resultado === 'ok' && <p className="animacion-ok">Video generado y guardado en el ejercicio.</p>}
        {(resultado === 'error' || error) && <p className="animacion-error">{error || 'No se pudo generar el video.'}</p>}
      </div>
    </div>
  )
}
