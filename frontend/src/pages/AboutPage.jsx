import BackButton from '../components/BackButton.jsx'
import './ModePage.css'
import './AboutPage.css'

/** De donde sale cada dato del sitio. Mantener al dia si se suma una fuente. */
const SOURCES = [
  {
    what: 'Alertas del subte y recorridos de colectivos',
    source: 'API Transporte del Gobierno de la Ciudad de Buenos Aires',
    url: 'https://api-transporte.buenosaires.gob.ar/',
    detail: 'Alertas de servicio en tiempo real y feed GTFS de colectivos (se actualiza una vez por día).',
  },
  {
    what: 'Estaciones de tren',
    source: 'Buenos Aires Data — Estaciones de ferrocarril',
    url: 'https://data.buenosaires.gob.ar/dataset/estaciones-ferrocarril',
    detail: 'Ubicación de las estaciones de las líneas metropolitanas.',
  },
  {
    what: 'Tarifas',
    source: 'Red SUBE (Argentina.gob.ar) y Gobierno de la Ciudad',
    url: 'https://www.argentina.gob.ar/redsube/tarifas-de-transporte-publico-amba',
    detail: 'Valores con SUBE registrada; se actualizan a mano cuando cambian.',
  },
  {
    what: 'Horarios del subte y el Premetro',
    source: 'Emova',
    url: 'https://emova.com.ar/',
    detail: 'Primer y último tren de cada línea.',
  },
  {
    what: 'Fechas de inauguración y estaciones del Premetro',
    source: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/List_of_Buenos_Aires_Underground_stations',
    detail: 'Fecha de cada estación de subte y ubicación de las estaciones del Premetro.',
  },
  {
    what: 'Tránsito en los accesos',
    source: 'TomTom Traffic',
    url: 'https://www.tomtom.com/products/traffic-apis/',
    detail: 'Velocidad actual y normal de cada tramo, medida cada 20 minutos.',
  },
  {
    what: 'Clima en los aeropuertos',
    source: 'Open-Meteo',
    url: 'https://open-meteo.com/',
    detail: 'Temperatura, viento y estado del cielo actuales.',
  },
  {
    what: 'Mapas',
    source: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/copyright',
    detail: '© colaboradores de OpenStreetMap, con licencia ODbL.',
  },
]

export default function AboutPage() {
  return (
    <div className="wrap content about">
      <BackButton />
      <h1 className="page-title">Acerca de BA Transit</h1>
      <p className="page-subtitle">El estado del transporte de Buenos Aires en un solo lugar.</p>

      <section className="about-block">
        <h2 className="about-heading">Qué es</h2>
        <p>
          BA Transit reúne el estado del subte, el Premetro, los trenes metropolitanos, los colectivos, los accesos
          a la Ciudad y los aeropuertos: alertas de servicio, recorridos, estaciones, horarios, tarifas y tránsito.
        </p>
        <p>
          Es un proyecto de <strong>Guillermo Guevara</strong>, estudiante de la Universidad Nacional de Hurlingham
          (UNAHUR), hecho con Java 21, Spring Boot, PostgreSQL, React y Leaflet.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-heading">Fuentes de datos</h2>
        <ul className="about-sources">
          {SOURCES.map((s) => (
            <li key={s.what}>
              <span className="about-what">{s.what}</span>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.source} ↗
              </a>
              <span className="about-detail">{s.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-block about-note">
        <h2 className="about-heading">Aviso</h2>
        <p>
          La información es orientativa y puede tener demoras o errores. Ante cualquier duda, consultá los canales
          oficiales de cada operador. BA Transit no tiene relación con los organismos ni las empresas mencionadas.
        </p>
      </section>
    </div>
  )
}
