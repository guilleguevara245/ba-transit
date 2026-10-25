import { Link } from 'react-router-dom'
import './BackButton.css'

export default function BackButton({ to = '/', children = 'Volver al inicio' }) {
  return (
    <Link to={to} className="back-button">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </Link>
  )
}
