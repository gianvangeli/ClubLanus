// Colores compartidos para los semáforos verde/amarillo/rojo (ver
// AdminGeneral.jsx, que fue la primera pantalla en usar esta convención).
export const COLOR_SEMAFORO = {
  verde: '#0ca30c',
  amarillo: '#fab219',
  rojo: '#d03b3b',
}

export const colorSemaforo = (semaforo) => COLOR_SEMAFORO[semaforo] || '#9aa0a6'
