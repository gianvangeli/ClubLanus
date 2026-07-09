// Acepta "75,5" o "75.5" (coma o punto decimal) y devuelve un número, null (vacío) o undefined (inválido).
export function aNumero(texto) {
  if (texto === null || texto === undefined) return null
  const limpio = String(texto).trim()
  if (!limpio) return null
  const normalizado = limpio.replace(',', '.')
  const valor = Number(normalizado)
  return Number.isNaN(valor) ? undefined : valor
}
