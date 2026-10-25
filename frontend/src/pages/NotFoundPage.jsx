import { Link } from 'react-router-dom'
import Chevrons from '../components/Chevrons.jsx'
import './NotFoundPage.css'

const SUGGESTIONS = [
  { to: '/', label: 'Inicio' },
  { to: '/mapa', label: 'Mapa de la red' },
  { to: '/colectivos', label: 'Colectivos' },
  { to: '/accesos', label: 'Accesos' },
]

/** Pagina para direcciones que no existen. */
export default function NotFoundPage() {
  return (
    <div className="wrap content not-found">
      <div className="not-found-code" aria-hidden="true">
        4<Chevrons />4
      </div>
      <h1 className="page-title">Esta página no existe</h1>
      <p className="not-found-text">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <div className="not-found-links">
        {SUGGESTIONS.map((s) => (
          <Link key={s.to} className="not-found-link chevrons-host" to={s.to}>
            {s.label} <Chevrons />
          </Link>
        ))}
      </div>
    </div>
  )
}
