import { normalizarEscena, ESCENA_VACIA } from '../CanchaEditor'

// Adapta cualquier valor guardado en `dibujo_json` al modelo nuevo, basado
// en escenas (fotogramas clave), sin tocar la base de datos:
//
// - Si ya viene en formato v2 ({version:2, escenas:[...]}), se devuelve tal
//   cual (con un paso de saneo liviano por si faltan campos).
// - Si es el formato viejo (una sola escena plana, sin "version"), se
//   envuelve como la única escena de un array de una posición ("Escena 1"):
//   un diagrama estático, sin animación disponible hasta que el usuario
//   agregue una segunda escena. No se pierde nada de lo ya cargado.
//
// Al guardar desde PizarraTactica siempre se escribe v2 — la próxima vez
// que se abra ese ejercicio, esta función ya no tiene nada que adaptar.

let idSeq = 1
const nuevoIdEscena = () => `escena-${Date.now()}-${idSeq++}`

const DURACION_TRANSICION_DEFAULT_MS = 1500

const escenaVaciaV2 = () => ({
  id: nuevoIdEscena(),
  nombre: 'Escena 1',
  duracionTransicionMs: DURACION_TRANSICION_DEFAULT_MS,
  jugadores: [],
  figuras: [],
  flechas: [],
  textos: [],
  trazos: [],
  zonas: [],
  imagenes: [],
})

const normalizarUnaEscena = (v, nombre) => {
  const base = normalizarEscena(v)
  return {
    id: v?.id || nuevoIdEscena(),
    nombre: v?.nombre || nombre,
    duracionTransicionMs: v?.duracionTransicionMs ?? DURACION_TRANSICION_DEFAULT_MS,
    jugadores: base.jugadores,
    figuras: base.figuras,
    flechas: base.flechas,
    textos: base.textos,
    trazos: base.trazos,
    zonas: base.zonas,
    // "Subir imagen" (spec 5.1) es exclusivo del modelo v2 — el CanchaEditor
    // clásico (normalizarEscena) no lo conoce, así que se lee directo de v.
    imagenes: v?.imagenes || [],
  }
}

export const normalizarEscenaV2 = (valor) => {
  if (valor?.version === 2) {
    return {
      version: 2,
      campo: valor.campo || ESCENA_VACIA.campo,
      equipos: valor.equipos || ESCENA_VACIA.equipos,
      escenas:
        Array.isArray(valor.escenas) && valor.escenas.length > 0
          ? valor.escenas.map((e, i) => normalizarUnaEscena(e, `Escena ${i + 1}`))
          : [escenaVaciaV2()],
    }
  }

  // Formato viejo (plano, una sola escena implícita) o vacío/sin valor.
  const legado = normalizarEscena(valor)
  return {
    version: 2,
    campo: legado.campo,
    equipos: legado.equipos,
    escenas: [normalizarUnaEscena({ ...legado, id: 'legacy-1' }, 'Escena 1')],
  }
}

export const nuevaEscenaVaciaV2 = escenaVaciaV2
