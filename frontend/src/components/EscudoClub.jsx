import escudoGranate from '../assets/escudo-granate.png'
import escudoBlanco from '../assets/escudo-blanco.png'

export default function EscudoClub({ size = 40, variante = 'granate' }) {
  const src = variante === 'blanco' ? escudoBlanco : escudoGranate

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Escudo Club Atlético Lanús"
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}
