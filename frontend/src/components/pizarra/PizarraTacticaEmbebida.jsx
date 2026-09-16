import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import PizarraTactica from './PizarraTactica'
import './PizarraTacticaEmbebida.css'

/**
 * Envoltorio de PizarraTactica para las fichas de ejercicio (Agenda diaria y
 * Entrenamientos Desglosados): en vez de mostrar siempre la cancha editable
 * completa (Konva) ocupando la columna del ejercicio, muestra una miniatura
 * estática del último tablero guardado y recién monta la pizarra de verdad
 * cuando se hace click, en pantalla completa real del navegador (Fullscreen
 * API, con fallback a un overlay a todo el viewport si el navegador la
 * rechaza o no la soporta).
 *
 * Reexpone `exportarImagen`/`obtenerMiniatura` vía ref con la misma forma
 * que PizarraTactica, para que las páginas sigan usando el ref tal cual ya
 * lo hacían.
 */
const PizarraTacticaEmbebida = forwardRef(function PizarraTacticaEmbebida(
  { value, onChange, miniatura, ejercicioId, endpointAnimacion, onGuardar, nombreArchivoExport },
  refExterna
) {
  const [abierta, setAbierta] = useState(false)
  const wrapperRef = useRef(null)
  const pizarraRef = useRef(null)

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement !== wrapperRef.current) setAbierta(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const abrir = () => {
    setAbierta(true)
    wrapperRef.current?.requestFullscreen?.().catch(() => {})
  }

  const cerrar = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    setAbierta(false)
  }

  useImperativeHandle(refExterna, () => ({
    exportarImagen: () => {
      if (abierta) return pizarraRef.current?.exportarImagen()
      if (!miniatura) return
      const link = document.createElement('a')
      link.download = nombreArchivoExport || 'pizarra-tactica.png'
      link.href = miniatura
      link.click()
    },
    obtenerMiniatura: () => (abierta ? pizarraRef.current?.obtenerMiniatura() ?? null : null),
  }))

  return (
    <div ref={wrapperRef} className={`pizarra-embebida ${abierta ? 'pizarra-embebida-abierta' : ''}`}>
      {abierta ? (
        <>
          <button type="button" className="pizarra-embebida-cerrar btn btn-ghost btn-icon" onClick={cerrar} title="Cerrar pantalla completa">
            ✕
          </button>
          <PizarraTactica
            ref={pizarraRef}
            value={value}
            onChange={onChange}
            editable
            ejercicioId={ejercicioId}
            endpointAnimacion={endpointAnimacion}
            onGuardar={onGuardar}
            nombreArchivoExport={nombreArchivoExport}
          />
        </>
      ) : (
        <button type="button" className="pizarra-miniatura" onClick={abrir}>
          {miniatura ? (
            <img src={miniatura} alt="Pizarra táctica guardada" />
          ) : (
            <div className="pizarra-miniatura-vacia">
              <span className="pizarra-miniatura-icono">🖊️</span>
              <span>Click para dibujar la pizarra</span>
            </div>
          )}
          <div className="pizarra-miniatura-overlay">⛶ Editar en pantalla completa</div>
        </button>
      )}
    </div>
  )
})

export default PizarraTacticaEmbebida
