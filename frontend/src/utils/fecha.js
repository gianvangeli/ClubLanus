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

// true si la fecha ya pasó (o es hoy), comparando solo el día calendario
// (no la hora) para no depender de la zona horaria del navegador.
export function esFechaPasada(fecha) {
  if (!fecha) return false
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return false
  return aInputDate(d) <= aInputDate(new Date())
}

// Formatea a "DD/MM/AAAA" en hora local (a diferencia de formatFecha, que
// usa componentes UTC para campos `date` sin hora). Para timestamps reales
// (creado_en, última visualización, etc.) donde la hora del día importa,
// así no se corre un día por la diferencia de huso horaria al revés.
export function formatFechaLocal(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getFullYear()}`
}

// Formatea a "DD/MM/AAAA, HH:MM" en hora local, para timestamps reales
// (no campos `date`) donde además de la fecha importa la hora exacta.
export function formatFechaHora(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  const hora = String(d.getHours()).padStart(2, '0')
  const minutos = String(d.getMinutes()).padStart(2, '0')
  return `${formatFechaLocal(fecha)}, ${hora}:${minutos}`
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
