import { Link } from 'react-router-dom'
import { LogoMark } from './Logo.jsx'
import './Footer.css'

/** Pie de pagina: autor, aviso corto y enlace a las fuentes de datos. */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-row">
        <span className="footer-brand">
          <LogoMark className="footer-mark" />
          BA Transit
        </span>
        <span className="footer-text">Proyecto de Guillermo Guevara · UNAHUR · Información orientativa</span>
        <Link className="footer-link" to="/acerca">
          Acerca de y fuentes de datos
        </Link>
      </div>
    </footer>
  )
}
