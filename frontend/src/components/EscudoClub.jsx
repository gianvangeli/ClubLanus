export default function EscudoClub({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Escudo Club Atlético Lanús">
      <path d="M32 3 L58 12 V30 C58 46 47 57 32 61 C17 57 6 46 6 30 V12 Z" fill="#7A1230" />
      <path d="M32 8 L53 15.5 V30 C53 43.5 44 52.5 32 56 C20 52.5 11 43.5 11 30 V15.5 Z" fill="#ffffff" />
      <path d="M32 12 L49 18 V30 C49 41 41.5 48.5 32 51.5 C22.5 48.5 15 41 15 30 V18 Z" fill="#7A1230" />
      <text
        x="32"
        y="37"
        fontFamily="Poppins, Georgia, serif"
        fontSize="20"
        fontWeight="700"
        fill="#ffffff"
        textAnchor="middle"
      >
        CAL
      </text>
    </svg>
  )
}
