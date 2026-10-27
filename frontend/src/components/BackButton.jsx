import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import './BackButton.css'

export default function BackButton({ to = '/', children = 'Volver al inicio' }) {
  return (
    <Link to={to} className="back-button chevrons-host">
      <Chevrons direction="left" />
      {children}
    </Link>
  )
}

/**
 * Varios botones para volver, del mas cercano al mas general (por ejemplo
 * "Volver a Subtes" y "Volver al inicio" en la pagina de una linea).
 */
export function BackTrail({ links }) {
  return (
    <nav className="back-trail" aria-label="Volver">
      {links.map((link) => (
        <BackButton key={link.to} to={link.to}>
          {link.label}
        </BackButton>
      ))}
    </nav>
  )
}
