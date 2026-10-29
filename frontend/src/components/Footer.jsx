import { Link } from 'react-router-dom'
import { LogoMark } from './Logo.jsx'
import InstallApp from './InstallApp.jsx'
import { useApi } from '../hooks/useApi.js'
import './Footer.css'

const STATUS_REFRESH_MS = 5 * 60_000

/** Pie de pagina: autor, aviso corto, estado de los datos y enlace a las fuentes. */
export default function Footer() {
  // Punto de color del enlace a "Estado de los datos": verde si todas las
  // fuentes responden, amarillo si alguna esta fallando.
  const { data: status } = useApi('/api/v1/estado', { refreshMs: STATUS_REFRESH_MS })
  const failing = status?.overall === 'ERROR'
  return (
    <footer className="footer">
      <div className="wrap footer-row">
        <span className="footer-brand">
          <LogoMark className="footer-mark" />
          BA Transit
        </span>
        <span className="footer-text">Proyecto de Guillermo Guevara · Información orientativa</span>
        <InstallApp />
        <nav className="footer-links" aria-label="Información del sitio">
          <Link className="footer-link footer-status" to="/estado">
            {status && <span className={failing ? 'footer-dot failing' : 'footer-dot'} aria-hidden="true" />}
            Estado de los datos
            {failing && <span className="visually-hidden"> (alguna fuente está fallando)</span>}
          </Link>
          <Link className="footer-link" to="/acerca">
            Acerca de y fuentes de datos
          </Link>
          <Link className="footer-link" to="/privacidad">
            Privacidad
          </Link>
          <Link className="footer-link" to="/condiciones">
            Condiciones
          </Link>
        </nav>
      </div>
    </footer>
  )
}
