// Miniatura liviana (SVG, no Konva) de una cancha, para usar como ícono de
// "espacio de trabajo" en la grilla del microciclo. No es interactiva.
const TIPOS = {
  completa: { alto: 60 },
  media: { alto: 60 },
  reducido: { alto: 60 },
  gimnasio: { alto: 60 },
}

export default function CanchaMiniatura({ tipo = 'completa', size = 46 }) {
  const cfg = TIPOS[tipo] || TIPOS.completa
  const w = 40
  const h = cfg.alto
  const linea = 'rgba(255,255,255,0.85)'

  if (tipo === 'gimnasio') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Espacio de trabajo: gimnasio">
        <rect x={0} y={0} width={w} height={h} fill="#5b5f97" rx={2} />
        <g stroke={linea} strokeWidth={2} strokeLinecap="round">
          <line x1={8} y1={h / 2} x2={w - 8} y2={h / 2} />
          <line x1={13} y1={h / 2 - 8} x2={13} y2={h / 2 + 8} />
          <line x1={w - 13} y1={h / 2 - 8} x2={w - 13} y2={h / 2 + 8} />
          <line x1={9} y1={h / 2 - 5} x2={9} y2={h / 2 + 5} />
          <line x1={w - 9} y1={h / 2 - 5} x2={w - 9} y2={h / 2 + 5} />
        </g>
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Espacio de trabajo: ${tipo}`}>
      <rect x={0} y={0} width={w} height={h} fill="#2f8f4e" rx={2} />

      {tipo === 'reducido' ? (
        <rect x={6} y={h / 2 - 12} width={w - 12} height={24} stroke={linea} strokeWidth={1.2} fill="none" strokeDasharray="2 2" />
      ) : (
        <>
          <rect x={1.5} y={1.5} width={w - 3} height={h - 3} stroke={linea} strokeWidth={1} fill="none" />
          {tipo === 'completa' && <line x1={1.5} y1={h / 2} x2={w - 1.5} y2={h / 2} stroke={linea} strokeWidth={1} />}
          <circle cx={w / 2} cy={tipo === 'completa' ? h / 2 : h - 1.5} r={7} stroke={linea} strokeWidth={1} fill="none" />
          <rect x={w / 2 - 9} y={1.5} width={18} height={10} stroke={linea} strokeWidth={1} fill="none" />
          {tipo === 'completa' && <rect x={w / 2 - 9} y={h - 11.5} width={18} height={10} stroke={linea} strokeWidth={1} fill="none" />}
        </>
      )}
    </svg>
  )
}
