import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import ExternalTitle from '../components/ExternalTitle.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import { SOURCE_GROUPS, whenLabel } from '../data/sources.js'
import { photoCredits } from '../data/stationPhotos.js'
import './ModePage.css'
import './AboutPage.css'

/** Con que esta hecho el sitio, y donde esta el codigo. */
const STACK = ['Java 21', 'Spring Boot', 'PostgreSQL', 'Flyway', 'React', 'Vite', 'Leaflet']
const REPO_URL = 'https://github.com/guilleguevara245/ba-transit'
const CODE_ICON = 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16'

/** Cada cuanto se actualiza un dato: "En vivo" lleva el punto verde. */
function WhenTag({ when }) {
  const label = whenLabel(when)
  if (!label) return null
  return <span className={when === 'live' ? 'about-when live' : 'about-when'}>{label}</span>
}

/**
 * Acerca de: que es, de donde sale cada dato (por tema), los creditos de
 * las fotos y el aviso. En computadora, un indice fijo a la izquierda.
 */
export default function AboutPage() {
  const credits = photoCredits()
  const index = [
    ['que-es', 'Qué es'],
    ['fuentes', 'Fuentes de datos'],
    ...SOURCE_GROUPS.map((g) => [g.id, g.title, g.icon]),
    ...(credits.length > 0 ? [['fotos', 'Fotos de las estaciones']] : []),
    ['aviso', 'Aviso'],
  ]
  return (
    <div className="wrap content about">
      <BackButton />
      <h1 className="page-title">Acerca de BA Transit</h1>
      <p className="page-subtitle">El estado del transporte de Buenos Aires en un solo lugar.</p>

      <div className="about-layout">
        <nav className="about-index" aria-label="En esta página">
          {index.map(([id, label, icon]) => (
            <a key={id} href={`#${id}`} className={icon ? 'about-index-sub' : undefined}>
              {icon && <ModeIcon mode={icon} size="sm" />}
              {label}
            </a>
          ))}
        </nav>

        <div className="about-main">
          <section className="about-block" id="que-es">
            <h2 className="about-heading">Qué es</h2>
            <p>
              BA Transit reúne el estado del subte, el Premetro, los trenes metropolitanos, los colectivos, EcoBici, los
              accesos a la Ciudad, el estacionamiento y los aeropuertos: alertas de servicio, próximos trenes,
              recorridos, horarios, tarifas, tránsito y cómo llegar de un lugar a otro.
            </p>
            <p>
              Es un proyecto personal de <strong>Guillermo Guevara</strong>.
            </p>
            <ul className="about-stack" aria-label="Tecnologías">
              {STACK.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            <a className="about-code" href={REPO_URL} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d={CODE_ICON} />
              </svg>
              <span>
                <ExternalTitle text="Ver el código en GitHub" />
              </span>
            </a>
          </section>

          <section className="about-block" id="fuentes">
            <h2 className="about-heading">Fuentes de datos</h2>
            <p>
              Casi todas son oficiales y abiertas. Cada dato dice cada cuánto se actualiza; para ver si están
              respondiendo ahora, mirá el <Link to="/estado">estado de los datos</Link>.
            </p>
            <nav className="about-chips" aria-label="Temas de las fuentes">
              {SOURCE_GROUPS.map((g) => (
                <a key={g.id} href={`#${g.id}`} className="about-chip">
                  <ModeIcon mode={g.icon} size="sm" />
                  {g.title}
                </a>
              ))}
            </nav>
            {SOURCE_GROUPS.map((g) => (
              <div key={g.id} className="about-group" id={g.id}>
                <h3 className="about-group-title">
                  <ModeIcon mode={g.icon} size="sm" />
                  {g.title}
                </h3>
                <ul className="about-sources">
                  {g.items.map((s) => (
                    <li key={s.what}>
                      <span className="about-what">
                        {s.what}
                        <WhenTag when={s.when} />
                      </span>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        <ExternalTitle text={s.source} />
                      </a>
                      <span className="about-detail">{s.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {credits.length > 0 && (
            <section className="about-block" id="fotos">
              <h2 className="about-heading">Fotos de las estaciones</h2>
              <p>
                Las {credits.length} fotos son de Wikimedia Commons y se usan según su licencia; para el sitio se
                recortaron y achicaron. Gracias a sus autores.
              </p>
              <details className="about-photos-list">
                <summary className="chevrons-host">
                  Ver autor y licencia de cada foto
                  <Chevrons />
                </summary>
                <ul className="about-sources about-photos">
                  {credits.map((c) => (
                    <li key={c.file}>
                      <span className="about-what">{c.name}</span>
                      <span className="about-detail">
                        Foto: {c.author} ·{' '}
                        {c.licenseUrl ? (
                          <a href={c.licenseUrl} target="_blank" rel="noreferrer">
                            {c.license}
                          </a>
                        ) : (
                          c.license
                        )}{' '}
                        ·{' '}
                        <a href={c.source} target="_blank" rel="noreferrer">
                          Ver en Wikimedia Commons
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}

          <section className="about-block about-note" id="aviso">
            <h2 className="about-heading">Aviso</h2>
            <p>
              La información es orientativa y puede tener demoras o errores. Ante cualquier duda, consultá los canales
              oficiales de cada operador. BA Transit no tiene relación con los organismos ni las empresas mencionadas.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
