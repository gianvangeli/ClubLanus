import { useEffect, useRef } from 'react'
import './YouTubePlayer.css'

let apiPromise = null

// Carga el script de la YouTube IFrame API una sola vez, sin importar
// cuántos reproductores haya en la página.
function cargarApiYouTube() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      anterior?.()
      resolve(window.YT)
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })

  return apiPromise
}

// Reproductor embebido de YouTube. Si se pasan onAbrir/onProgreso, informa
// cuándo el jugador empieza a ver el video (primera reproducción), y cada
// 15s mientras lo mira (más al pausarlo/terminarlo) — igual que el
// seguimiento que ya existe para los videos subidos como archivo.
export default function YouTubePlayer({ videoId, onAbrir, onProgreso }) {
  const contenedorRef = useRef(null)
  const playerRef = useRef(null)
  const intervaloRef = useRef(null)
  const abiertoRef = useRef(false)

  useEffect(() => {
    let cancelado = false

    cargarApiYouTube().then((YT) => {
      if (cancelado || !contenedorRef.current) return

      playerRef.current = new YT.Player(contenedorRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              if (!abiertoRef.current) {
                abiertoRef.current = true
                onAbrir?.()
              }
              if (intervaloRef.current) clearInterval(intervaloRef.current)
              intervaloRef.current = setInterval(() => {
                onProgreso?.(Math.floor(playerRef.current.getCurrentTime()), false)
              }, 15000)
            } else if (e.data === YT.PlayerState.PAUSED) {
              if (intervaloRef.current) clearInterval(intervaloRef.current)
              onProgreso?.(Math.floor(playerRef.current.getCurrentTime()), false)
            } else if (e.data === YT.PlayerState.ENDED) {
              if (intervaloRef.current) clearInterval(intervaloRef.current)
              onProgreso?.(Math.floor(playerRef.current.getDuration()), true)
            }
          },
        },
      })
    })

    return () => {
      cancelado = true
      if (intervaloRef.current) clearInterval(intervaloRef.current)
      playerRef.current?.destroy?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  return (
    <div className="youtube-player-wrap">
      <div ref={contenedorRef} />
    </div>
  )
}
