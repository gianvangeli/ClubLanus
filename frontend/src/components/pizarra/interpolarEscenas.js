// Motor de interpolación del sistema de animación por escenas (sección 6
// de la spec): dado un array de escenas y un tiempo global (ms), calcula
// una "escena sintética" a mostrar en ese instante, moviendo jugadores y
// figuras de su posición en la escena anterior a su posición en la
// siguiente (emparejados por `id`), y mostrando/ocultando con fundido los
// elementos que aparecen o desaparecen entre una escena y otra.
//
// Los dibujos estáticos (flechas, textos, trazos, zonas) NUNCA se
// interpretan como movimiento — solo se funden in/out entre escenas, tal
// como pide la spec ("el dibujo NO es la animación").

const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => t // lineal por ahora; queda como punto de ajuste fino

const construirMapa = (lista) => Object.fromEntries(lista.map((el) => [el.id, el]))

// Interpola listas "posicionales" (x,y): jugadores y figuras.
function interpolarListaPosicional(anterior, siguiente, t) {
  const mapaAnt = construirMapa(anterior)
  const mapaSig = construirMapa(siguiente)
  const ids = new Set([...anterior.map((e) => e.id), ...siguiente.map((e) => e.id)])
  const resultado = []
  ids.forEach((id) => {
    const a = mapaAnt[id]
    const b = mapaSig[id]
    if (a && b) {
      resultado.push({ ...b, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rotacion: lerp(a.rotacion || 0, b.rotacion || 0, t) })
    } else if (b) {
      resultado.push({ ...b, opacity: t }) // aparece: fade in
    } else if (a) {
      resultado.push({ ...a, opacity: 1 - t }) // desaparece: fade out
    }
  })
  return resultado
}

// Listas "estáticas" (con `points` o geometría propia): solo fade in/out,
// sin morphing de forma.
function interpolarListaEstatica(anterior, siguiente, t) {
  const mapaAnt = construirMapa(anterior)
  const mapaSig = construirMapa(siguiente)
  const ids = new Set([...anterior.map((e) => e.id), ...siguiente.map((e) => e.id)])
  const resultado = []
  ids.forEach((id) => {
    const a = mapaAnt[id]
    const b = mapaSig[id]
    if (a && b) resultado.push(b)
    else if (b) resultado.push({ ...b, opacity: t })
    else if (a) resultado.push({ ...a, opacity: 1 - t })
  })
  return resultado
}

export const duracionTotalMs = (escenas) => escenas.slice(1).reduce((acc, e) => acc + (e.duracionTransicionMs || 1500), 0)

// tGlobalMs: tiempo transcurrido desde el arranque de la animación completa.
export function escenaInterpolada(escenas, tGlobalMs) {
  if (escenas.length === 0) return null
  if (escenas.length === 1) return escenas[0]

  let acumulado = 0
  for (let i = 1; i < escenas.length; i++) {
    const duracion = escenas[i].duracionTransicionMs || 1500
    if (tGlobalMs <= acumulado + duracion || i === escenas.length - 1) {
      const t = ease(Math.max(0, Math.min(1, (tGlobalMs - acumulado) / duracion)))
      const anterior = escenas[i - 1]
      const siguiente = escenas[i]
      return {
        ...siguiente,
        jugadores: interpolarListaPosicional(anterior.jugadores, siguiente.jugadores, t),
        figuras: interpolarListaPosicional(anterior.figuras, siguiente.figuras, t),
        flechas: interpolarListaEstatica(anterior.flechas, siguiente.flechas, t),
        textos: interpolarListaEstatica(anterior.textos, siguiente.textos, t),
        trazos: interpolarListaEstatica(anterior.trazos, siguiente.trazos, t),
        zonas: interpolarListaEstatica(anterior.zonas, siguiente.zonas, t),
        imagenes: interpolarListaEstatica(anterior.imagenes, siguiente.imagenes, t),
      }
    }
    acumulado += duracion
  }
  return escenas[escenas.length - 1]
}
