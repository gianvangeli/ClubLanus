// Extrae el ID de video de una URL de YouTube (watch, youtu.be, embed, shorts).
// Devuelve null si el link no es de YouTube o no se pudo reconocer el formato.
export function extraerIdYouTube(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return u.pathname.slice(1) || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      const match = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/)
      if (match) return match[2]
    }

    return null
  } catch {
    return null
  }
}
