// Zonas de estado (good/warning/serious/critical) y escalas de referencia
// para los indicadores nutricionales — fijas para todo el club, compartidas
// entre el informe individual (JugadorNutricion) y el reporte grupal
// (AdminObjetivosNutricionales).
export const COLOR_GOOD = '#0ca30c'
export const COLOR_WARNING = '#fab219'
export const COLOR_SERIOUS = '#ec835a'
export const COLOR_CRITICAL = '#d03b3b'

export const ZONAS_INDICE_MO = [
  { desde: 2.8, hasta: 3.6, color: COLOR_CRITICAL, etiqueta: 'Pobre' },
  { desde: 3.6, hasta: 4.2, color: COLOR_SERIOUS, etiqueta: 'Deficiente' },
  { desde: 4.2, hasta: 5.2, color: COLOR_WARNING, etiqueta: 'Bueno' },
  { desde: 5.2, hasta: 6.0, color: COLOR_GOOD, etiqueta: 'Excelente' },
]

export const ZONAS_SUMA_6PL = [
  { desde: 33.8, hasta: 43.58, color: COLOR_GOOD, etiqueta: 'Excelente' },
  { desde: 43.58, hasta: 53.35, color: COLOR_WARNING, etiqueta: 'Muy buena' },
  { desde: 53.35, hasta: 63.13, color: COLOR_SERIOUS, etiqueta: 'Regular' },
  { desde: 63.13, hasta: 72.9, color: COLOR_CRITICAL, etiqueta: 'Pobre' },
]

// Color de una zona para un valor puntual (para colorear celdas de tabla,
// no solo el gauge). null si el valor cae fuera de todas las zonas.
export const colorDeZona = (zonas, valor) => {
  if (valor == null) return null
  const num = Number(valor)
  const zona = zonas.find((z) => num >= z.desde && num < z.hasta)
  return zona?.color || null
}
