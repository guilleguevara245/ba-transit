import { Link } from 'react-router-dom'
import ExternalTitle from './ExternalTitle.jsx'
import InstallApp from './InstallApp.jsx'
import { LogoMark } from './Logo.jsx'
import { useApi } from '../hooks/useApi.js'
import { useSession } from '../hooks/useSession.js'
import { OPERATOR_SITES } from '../utils/serviceHours.js'
import './Footer.css'

const STATUS_REFRESH_MS = 5 * 60_000
const ISSUES_URL = 'https://github.com/guilleguevara245/ba-transit/issues'

const TRAVEL = [
  ['/mapa', 'Mapa'],
  ['/como-llegar', 'Cómo llegar'],
  ['/colectivos', 'Colectivos'],
  ['/ecobici', 'EcoBici'],
  ['/estacionamiento', 'Estacionamiento'],
  ['/accesos', 'Accesos'],
  ['/aeropuertos', 'Aeropuertos'],
]

/** Sitios oficiales de cada operadora: [nombre, aclaracion, direccion]. */
const OPERATORS = [
  ['Emova', 'subte y Premetro', OPERATOR_SITES['Emova Movilidad']],
  ['Trenes Argentinos', null, OPERATOR_SITES['Trenes Argentinos Operaciones']],
  ['Metrovías', 'Urquiza', OPERATOR_SITES['Metrovías']],
  ['Ferrovías', 'Belgrano Norte', OPERATOR_SITES['Ferrovías']],
  ['SUBE', null, 'https://www.argentina.gob.ar/sube'],
]

function Column({ title, children }) {
  return (
    <nav className="footer-col" aria-label={title}>
      <h2>{title}</h2>
      <ul>{children}</ul>
    </nav>
  )
}

/**
 * Pie de pagina: una franja para reportar errores o pedir mejoras, la
 * marca con el estado de los datos, las secciones, la cuenta, los sitios
 * de las operadoras, la informacion del sitio y una barra legal. Oscuro,
 * con la linea amarilla, como el header.
 */
export default function Footer() {
  // Verde si todas las fuentes responden; amarillo si alguna esta fallando.
  const { data: status } = useApi('/api/v1/estado', { refreshMs: STATUS_REFRESH_MS })
  const failing = status?.overall === 'ERROR'
  const session = useSession()

  return (
    <footer className="footer">
      <div className="footer-band">
        <div className="wrap footer-band-row">
          <p>¿Encontraste un error o tenés una idea?</p>
          <a className="footer-band-main" href={`${ISSUES_URL}/new`} target="_blank" rel="noreferrer">
            Contanos
          </a>
          <a className="footer-band-alt" href={ISSUES_URL} target="_blank" rel="noreferrer">
            Ver lo que ya se pidió
          </a>
        </div>
      </div>

      <div className="wrap footer-main">
        <div className="footer-about">
          <Link to="/" className="footer-brand" aria-label="BA Transit, ir al inicio">
            <LogoMark className="footer-mark" />
            <span>
              <b>BA</b> TRANSIT
            </span>
          </Link>
          <p>
            El estado del subte, los trenes, los colectivos y los accesos de Buenos Aires, en un solo lugar. Proyecto de
            Guillermo Guevara.
          </p>
          <div className="footer-actions">
            <InstallApp />
            <Link className="footer-status" to="/estado">
              <span className={failing ? 'footer-dot failing' : 'footer-dot'} aria-hidden="true" />
              {status ? (failing ? 'Alguna fuente con problemas' : 'Datos al día') : 'Estado de los datos'}
            </Link>
          </div>
        </div>

        <Column title="Viajar">
          {TRAVEL.map(([to, label]) => (
            <li key={to}>
              <Link to={to}>{label}</Link>
            </li>
          ))}
        </Column>

        <Column title="Tu cuenta">
          <li>
            <Link to={session ? '/cuenta' : '/ingresar'}>{session ? 'Tu cuenta' : 'Ingresar'}</Link>
          </li>
          <li>
            <Link to="/mis-lugares">Mis lugares</Link>
          </li>
          <li>
            <Link to="/notificaciones">Avisos</Link>
          </li>
        </Column>

        <Column title="Operadores">
          {OPERATORS.map(([name, detail, url]) => (
            <li key={name}>
              <a href={url} target="_blank" rel="noreferrer">
                {detail ? (
                  <>
                    {name}{' '}
                    <small>
                      <ExternalTitle text={detail} />
                    </small>
                  </>
                ) : (
                  <ExternalTitle text={name} />
                )}
              </a>
            </li>
          ))}
        </Column>

        <Column title="Información">
          <li>
            <Link to="/acerca">Acerca de y fuentes</Link>
          </li>
          <li>
            <Link to="/estado">Estado de los datos</Link>
          </li>
          <li>
            <Link to="/privacidad">Privacidad</Link>
          </li>
          <li>
            <Link to="/condiciones">Condiciones</Link>
          </li>
        </Column>
      </div>

      <div className="wrap footer-legal">
        <span>
          © {new Date().getFullYear()} BA Transit · Información orientativa: ante cualquier duda, confirmá con cada
          operador.
        </span>
        <span className="footer-legal-links">
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/condiciones">Condiciones</Link>
          <a href={ISSUES_URL} target="_blank" rel="noreferrer">
            Contacto
          </a>
        </span>
      </div>
    </footer>
  )
}
