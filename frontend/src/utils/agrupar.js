// Agrupa un array de objetos con campo `categoria` preservando el orden de
// aparición de cada categoría (no asume una plantilla fija: la IA puede
// devolver categorías no anticipadas, ej. "Otros").
export const agruparPorCategoria = (items) => {
  const grupos = new Map()
  items.forEach((item) => {
    if (!grupos.has(item.categoria)) grupos.set(item.categoria, [])
    grupos.get(item.categoria).push(item)
  })
  return Array.from(grupos.entries()).map(([categoria, items]) => ({ categoria, items }))
}
