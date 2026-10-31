import BackButton from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import { photoCredits } from '../data/stationPhotos.js'
import './ModePage.css'
import './AboutPage.css'

/** De donde sale cada dato del sitio. Mantener al dia si se suma una fuente. */
const SOURCES = [
  {
    what: 'Alertas del subte y de colectivos, y recorridos de colectivos',
    source: 'API Transporte del Gobierno de la Ciudad de Buenos Aires',
    url: 'https://api-transporte.buenosaires.gob.ar/',
    detail:
      'Alertas de servicio en tiempo real (en colectivos, por línea) y feed GTFS de colectivos (se actualiza una vez por día).',
  },
  {
    what: 'Estaciones de tren',
    source: 'Buenos Aires Data — Estaciones de ferrocarril',
    url: 'https://data.buenosaires.gob.ar/dataset/estaciones-ferrocarril',
    detail: 'Ubicación de las estaciones de las líneas metropolitanas.',
  },
  {
    what: 'Ramales del Roca',
    source: 'datos.gob.ar — Estaciones de trenes con servicios activos y red ferroviaria (ADIFSE, 2022)',
    url: 'https://datos.gob.ar/dataset/transporte-estaciones-trenes-servicios-activos-2022',
    detail: 'Estaciones y orden de cada ramal, a partir de la ubicación de las estaciones y el trazado de las vías.',
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
    what: 'Frecuencias programadas del subte y el Premetro',
    source: 'API Transporte (Gobierno de la Ciudad), GTFS del subte',
    url: 'https://www.buenosaires.gob.ar/desarrollourbano/transporte/apitransporte',
    detail:
      'Frecuencia por franja horaria y tiempo entre estaciones, para estimar las próximas pasadas cuando no hay datos en vivo.',
  },
  {
    what: 'Estaciones accesibles del subte',
    source: 'Emova — Información de las estaciones',
    url: 'https://emova.com.ar/index.php/informacion-de-las-estaciones/',
    detail: 'Estaciones marcadas como accesibles por la operadora.',
  },
  {
    what: 'Fechas de inauguración y estaciones del Premetro',
    source: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/List_of_Buenos_Aires_Underground_stations',
    detail: 'Fecha de cada estación de subte y ubicación de las estaciones del Premetro.',
  },
  {
    what: 'Subte, colectivos y EcoBici en vivo',
    source: 'API Transporte del Gobierno de la Ciudad de Buenos Aires',
    url: 'https://api-transporte.buenosaires.gob.ar/',
    detail: 'Próximos trenes del subte, posición de los colectivos y disponibilidad de EcoBici.',
  },
  {
    what: 'Servicios especiales y cambios en trenes',
    source: 'Trenes Argentinos — Modificaciones en el servicio',
    url: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades',
    detail: 'Se cargan a mano a partir de los avisos oficiales.',
  },
  {
    what: 'Estacionamiento',
    source: 'Buenos Aires Data — Garajes Comerciales, Estacionamientos concesionados y Estacionamientos de Motos',
    url: 'https://data.buenosaires.gob.ar/dataset/garajes-comerciales',
    detail:
      'Garajes y playas de estacionamiento de toda la Ciudad, y cocheras y lugares en la calle para motos del microcentro (actualizados el 22/06/2026).',
  },
  {
    what: 'Estacionamiento en el conurbano',
    source: 'OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL)',
    url: 'https://www.openstreetmap.org/copyright',
    detail:
      'Playas y garajes de los 40 partidos del AMBA, con el partido de cada uno. Son datos colaborativos, no oficiales: los municipios no publican datos abiertos de estacionamiento.',
  },
  {
    what: 'Peajes',
    source: 'Resoluciones de Vialidad Nacional y de la Provincia (vía La Nación y Ámbito)',
    url: 'https://www.argentina.gob.ar/obras-publicas/vialidad-nacional',
    detail: 'Valores para autos con y sin TelePASE; cada cuadro indica su vigencia.',
  },
  {
    what: 'Tránsito en los accesos',
    source: 'TomTom Traffic',
    url: 'https://www.tomtom.com/products/traffic-apis/',
    detail:
      'Velocidad actual y normal de cada tramo, en cada mano (hacia CABA y hacia Provincia), medida cada 20 minutos.',
  },
  {
    what: 'Aviones en vivo',
    source: 'adsb.lol',
    url: 'https://adsb.lol/',
    detail:
      'Posición, altura y velocidad de los aviones alrededor de Buenos Aires, con las señales que reciben antenas voluntarias. Datos abiertos bajo licencia ODbL.',
  },
  {
    what: 'Pronóstico del clima (Tu día y aeropuertos)',
    source: 'Open-Meteo y, de respaldo, MET Norway (datos con licencia CC BY 4.0)',
    url: 'https://open-meteo.com/',
    detail:
      'Temperatura, lluvia y viento hora por hora, a partir de modelos meteorológicos globales. Si Open-Meteo no responde se usa el pronóstico del Instituto Meteorológico de Noruega (api.met.no). Las alertas son las oficiales del SMN.',
  },
  {
    what: 'Direcciones de Mis lugares',
    source: 'Georef, Servicio de Normalización de Datos Geográficos (datos.gob.ar)',
    url: 'https://datosgobar.github.io/georef-ar-api/',
    detail:
      'Confirma que la dirección de Casa, Trabajo y los otros lugares exista en el AMBA y dice dónde queda, para sumar la estación más cercana.',
  },
  {
    what: 'Avisos de los trenes',
    source: 'Trenes Argentinos, modificaciones en el servicio y novedades',
    url: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades',
    detail:
      'Obras, recorridos limitados, interrupciones y estaciones cerradas de Roca, Mitre, Sarmiento, San Martín, Belgrano Sur y Tren de la Costa, revisados cada 15 minutos.',
  },
  {
    what: 'Estado del Urquiza',
    source: 'Metrovías, estado de las líneas',
    url: 'https://info.metrovias.com.ar/EstadoLineas/Desktop.html',
    detail: 'Estado del servicio informado por Metrovías, revisado cada 5 minutos.',
  },
  {
    what: 'Próximos trenes del Belgrano Norte',
    source: 'Ferrovías, pantalla de próximos trenes',
    url: 'http://proximostrenes.ferrovias.com.ar/',
    detail: 'Tiempo estimado y destino de los próximos trenes de cada estación, actualizado cada 30 segundos.',
  },
  {
    what: 'Alertas meteorológicas',
    source: 'Servicio Meteorológico Nacional (feed CAP)',
    url: 'https://www.smn.gob.ar/alertas',
    detail:
      'Alertas amarillas, naranjas y rojas por tormentas, lluvias y calor que afectan al AMBA, revisadas cada 10 minutos.',
  },
  {
    what: 'Horario del último tren',
    source: 'Emova, horarios del servicio',
    url: 'https://emova.com.ar/',
    detail: 'Salida del último tren desde cada cabecera; la hora en cada estación es estimada (±5 min).',
  },
  {
    what: 'Mapas',
    source: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/copyright',
    detail: '© colaboradores de OpenStreetMap, con licencia ODbL.',
  },
]

export default function AboutPage() {
  const credits = photoCredits()
  return (
    <div className="wrap content about">
      <BackButton />
      <h1 className="page-title">Acerca de BA Transit</h1>
      <p className="page-subtitle">El estado del transporte de Buenos Aires en un solo lugar.</p>

      <section className="about-block">
        <h2 className="about-heading">Qué es</h2>
        <p>
          BA Transit reúne el estado del subte, el Premetro, los trenes metropolitanos, los colectivos, los accesos a la
          Ciudad y los aeropuertos: alertas de servicio, recorridos, estaciones, horarios, tarifas y tránsito.
        </p>
        <p>
          Es un proyecto personal de <strong>Guillermo Guevara</strong>, hecho con Java 21, Spring Boot, PostgreSQL,
          React y Leaflet.
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

      {credits.length > 0 && (
        <section className="about-block">
          <h2 className="about-heading">Fotos de las estaciones</h2>
          <p>
            Las {credits.length} fotos son de Wikimedia Commons y se usan según su licencia; para el sitio se recortaron
            y achicaron. Gracias a sus autores.
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
