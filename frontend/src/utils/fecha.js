// Convierte una fecha (Date, string ISO, "YYYY-MM-DD") a "YYYY-MM-DD" para
// inputs type="date", usando los componentes UTC para no correrse un día
// por la zona horaria del navegador (una fecha de nacimiento no tiene hora).
export function aInputDate(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  const anio = d.getUTCFullYear()
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(d.getUTCDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

// Formatea a "DD/MM/YYYY" para mostrar.
export function formatFecha(fecha) {
  if (!fecha) return null
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

// Formatea con Intl (weekday/mes largo o corto, etc.) fijando timeZone
// "UTC": los campos `date` de MySQL llegan como "YYYY-MM-DD", que el
// navegador interpreta como medianoche UTC — sin esto, en Argentina
// (UTC-3) toLocaleDateString muestra el día anterior.
export function formatFechaUTC(fecha, opciones) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR', { ...opciones, timeZone: 'UTC' })
}

// true si la fecha ya pasó (o es hoy), comparando solo el día calendario
// (no la hora) para no depender de la zona horaria del navegador.
export function esFechaPasada(fecha) {
  if (!fecha) return false
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return false
  return aInputDate(d) <= aInputDate(new Date())
}

// Calcula la edad en años a partir de la fecha de nacimiento. La edad nunca
// se carga a mano: siempre se deriva de esta fecha (acá para la vista
// previa al cargarla; el backend hace el mismo cálculo para lo que se guarda).
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const fecha = new Date(fechaNacimiento)
  if (Number.isNaN(fecha.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - fecha.getUTCFullYear()
  const diffMes = hoy.getMonth() - fecha.getUTCMonth()
  if (diffMes < 0 || (diffMes === 0 && hoy.getDate() < fecha.getUTCDate())) {
    edad--
  }
  return edad
}
