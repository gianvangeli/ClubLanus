import { Link } from 'react-router-dom'

const TABS = [
  { key: 'informe', etiqueta: 'Informe', to: (id) => `/admin/jugadores/${id}/nutricion` },
  { key: 'evaluaciones', etiqueta: 'Evaluaciones', to: (id) => `/admin/jugadores/${id}/nutricion/evaluaciones` },
  { key: 'dieta', etiqueta: 'Dieta personalizada', to: (id) => `/admin/jugadores/${id}/nutricion/dieta` },
]

export default function NutricionTabs({ jugadorId, activa }) {
  return (
    <div className="nutricion-tabs">
      {TABS.map((t) => (
        <Link
          key={t.key}
          to={t.to(jugadorId)}
          className={`btn btn-sm ${activa === t.key ? 'btn-primary' : 'btn-ghost'}`}
        >
          {t.etiqueta}
        </Link>
      ))}
    </div>
  )
}
