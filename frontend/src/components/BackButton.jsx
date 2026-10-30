import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import './BackButton.css'

/** color: el de la linea a la que se vuelve (borde y chevrones al pasar el mouse); sin color, el amarillo del sitio. */
export default function BackButton({ to = '/', children = 'Volver al inicio', color }) {
  return (
    <Link to={to} className="back-button chevrons-host" style={color ? { '--back-color': color } : undefined}>
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
        <BackButton key={link.to} to={link.to} color={link.color}>
          {link.label}
        </BackButton>
      ))}
    </nav>
  )
}
