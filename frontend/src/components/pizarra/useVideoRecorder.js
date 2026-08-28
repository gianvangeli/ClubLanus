import { useRef, useState } from 'react'
import api from '../../api/client'
import { escenaInterpolada, duracionTotalMs } from './interpolarEscenas'

const FPS = 30

const elegirMimeType = () => {
  const candidatos = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const c of candidatos) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c
  }
  return null
}

export const soportaGrabacion = () =>
  typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'

/**
 * Genera un video real (webm) a partir de una secuencia de escenas,
 * grabando en el navegador la interpolación entre fotogramas clave
 * (MediaRecorder + captureStream del canvas fusionado de Konva — no hay
 * renderizado en el servidor). Requiere que el llamador mantenga montado
 * un <CampoLienzo> "de preview" cuyo `escena` prop se actualiza con
 * `onFrame` en cada tick, y pase su `stageRef` acá para poder tomar cada
 * frame ya pintado.
 */
export default function useVideoRecorder({ escenas, stageRef, canvasCapturaRef, onFrame }) {
  const [grabando, setGrabando] = useState(false)
  const [progresoMs, setProgresoMs] = useState(0)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)
  const rafRef = useRef(null)

  const duracionTotal = duracionTotalMs(escenas)

  const detener = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setGrabando(false)
  }

  const generarYSubir = (ejercicioId) =>
    new Promise((resolve, reject) => {
      if (!soportaGrabacion()) {
        const e = new Error('Este navegador no puede generar video (MediaRecorder/captureStream no disponibles).')
        setError(e.message)
        reject(e)
        return
      }
      if (escenas.length < 2) {
        const e = new Error('Hacen falta al menos 2 escenas para generar una animación.')
        setError(e.message)
        reject(e)
        return
      }
      const mimeType = elegirMimeType()
      if (!mimeType) {
        const e = new Error('Este navegador no soporta grabación en formato webm.')
        setError(e.message)
        reject(e)
        return
      }

      setError(null)
      const canvasCaptura = canvasCapturaRef.current
      const stream = canvasCaptura.captureStream(FPS)
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks = []
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)

      recorder.onstop = async () => {
        detener()
        const blob = new Blob(chunks, { type: mimeType })
        const archivo = new File([blob], `animacion-ejercicio-${ejercicioId || 'x'}.webm`, { type: 'video/webm' })
        try {
          setSubiendo(true)
          const datos = new FormData()
          datos.append('animacion', archivo)
          await api.post(`/ejercicios-tacticos/${ejercicioId}/animacion`, datos)
          setSubiendo(false)
          resolve(archivo)
        } catch (err) {
          setSubiendo(false)
          setError('No se pudo subir el video generado.')
          reject(err)
        }
      }

      setGrabando(true)
      setProgresoMs(0)
      recorder.start()

      const ctx = canvasCaptura.getContext('2d')
      const inicio = performance.now()

      const tick = (ahora) => {
        const t = ahora - inicio
        // Dibuja el frame YA pintado por el Stage offscreen (levemente
        // detrás del tick anterior), y en paralelo actualiza la escena
        // interpolada para que Konva la tenga lista para el próximo tick.
        if (stageRef.current) {
          const canvasFuente = stageRef.current.toCanvas({ pixelRatio: 1 })
          ctx.clearRect(0, 0, canvasCaptura.width, canvasCaptura.height)
          ctx.drawImage(canvasFuente, 0, 0, canvasCaptura.width, canvasCaptura.height)
        }
        setProgresoMs(Math.min(t, duracionTotal))

        if (t >= duracionTotal) {
          onFrame(escenas[escenas.length - 1])
          recorder.stop()
          return
        }
        onFrame(escenaInterpolada(escenas, t))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    })

  return { grabando, progresoMs, duracionTotal, subiendo, error, generarYSubir, cancelar: detener }
}
