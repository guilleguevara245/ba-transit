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
