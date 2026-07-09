import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <h1>Página no encontrada</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
        La ruta a la que intentaste acceder no existe.
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
        Volver al inicio
      </Link>
    </div>
  )
}
