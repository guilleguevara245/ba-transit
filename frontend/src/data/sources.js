/**
 * De donde sale cada dato del sitio, agrupado por tema (para Acerca de).
 * Mantener al dia si se suma una fuente o cambia cada cuanto se revisa.
 *
 * when: cada cuanto se actualiza. 'live' (en vivo), 'daily' (una vez por
 * dia), 'manual' (se carga a mano cuando cambia el dato oficial), 'fixed'
 * (datos de una fecha), 'search' (se consulta al buscar) o { every: '5 min' }.
 */
const API_TRANSPORTE = 'API Transporte GCBA (Gobierno de la Ciudad de Buenos Aires)'
const API_TRANSPORTE_URL = 'https://api-transporte.buenosaires.gob.ar/'
const TRENES_AVISOS_URL =
  'https://www.argentina.gob.ar/transporte/trenes-argentinos/modificaciones-en-el-servicio-y-novedades'
const OSM_URL = 'https://www.openstreetmap.org/copyright'

export const SOURCE_GROUPS = [
  {
    id: 'subte',
    title: 'Subte y Premetro',
    icon: 'SUBTE',
    items: [
      {
        what: 'Próximos trenes y alertas',
        source: API_TRANSPORTE,
        url: API_TRANSPORTE_URL,
        detail:
          'Próximos trenes de cada estación, alertas de servicio de cada línea y, en el mapa, la posición de cada tren estimada con esos horarios (el subte no informa GPS).',
        when: 'live',
      },
      {
        what: 'Frecuencias programadas',
        source: 'API Transporte GCBA, GTFS del subte',
        url: 'https://www.buenosaires.gob.ar/desarrollourbano/transporte/apitransporte',
        detail:
          'Frecuencia por franja horaria y tiempo entre estaciones, para estimar las próximas pasadas cuando no hay datos en vivo.',
        when: 'fixed',
      },
      {
        what: 'Horarios y último tren',
        source: 'Emova, horarios del servicio',
        url: 'https://emova.com.ar/',
        detail:
          'Primer y último tren de cada línea desde cada cabecera; la hora en cada estación es estimada (±5 min).',
        when: 'manual',
      },
      {
        what: 'Estaciones accesibles',
        source: 'Emova — Información de las estaciones',
        url: 'https://emova.com.ar/index.php/informacion-de-las-estaciones/',
        detail: 'Estaciones marcadas como accesibles por la operadora.',
        when: 'manual',
      },
      {
        what: 'Fechas de inauguración y estaciones del Premetro',
        source: 'Wikipedia',
        url: 'https://en.wikipedia.org/wiki/List_of_Buenos_Aires_Underground_stations',
        detail: 'Fecha de cada estación de subte y ubicación de las estaciones del Premetro.',
        when: 'fixed',
      },
    ],
  },
  {
    id: 'trenes',
    title: 'Trenes',
    icon: 'TREN',
    items: [
      {
        what: 'Estaciones',
        source: 'Buenos Aires Data — Estaciones de ferrocarril',
        url: 'https://data.buenosaires.gob.ar/dataset/estaciones-ferrocarril',
        detail: 'Ubicación de las estaciones de las líneas metropolitanas.',
        when: 'fixed',
      },
      {
        what: 'Ramales del Roca',
        source: 'datos.gob.ar — Estaciones de trenes con servicios activos y red ferroviaria (ADIFSE, 2022)',
        url: 'https://datos.gob.ar/dataset/transporte-estaciones-trenes-servicios-activos-2022',
        detail:
          'Estaciones y orden de cada ramal, a partir de la ubicación de las estaciones y el trazado de las vías.',
        when: 'fixed',
      },
      {
        what: 'Servicios especiales',
        source: 'Trenes Argentinos — Modificaciones en el servicio y novedades',
        url: TRENES_AVISOS_URL,
        detail: 'Servicios especiales y cambios programados de los trenes, cargados a mano a partir de los avisos oficiales.',
        when: 'manual',
      },
      {
        what: 'Estado del Urquiza',
        source: 'Metrovías, estado de las líneas',
        url: 'https://info.metrovias.com.ar/EstadoLineas/Desktop.html',
        detail: 'Estado del servicio informado por Metrovías.',
        when: { every: '5 min' },
      },
      {
        what: 'Próximos trenes del Belgrano Norte',
        source: 'Ferrovías, pantalla de próximos trenes',
        url: 'http://proximostrenes.ferrovias.com.ar/',
        detail: 'Tiempo estimado y destino de los próximos trenes de cada estación.',
        when: 'live',
      },
      {
        what: 'Próximos trenes y alertas de Trenes Argentinos',
        source: 'API de Trenes de Ariel Aguirre (ariedro), que consulta el servicio de Trenes Argentinos',
        url: 'https://github.com/ariedro/api-trenes',
        detail:
          'Próximos trenes de cada estación del Roca, Mitre, Sarmiento, San Martín, Belgrano Sur y Tren de la Costa, con su destino, el andén, los trenes rápidos y los cancelados; en el mapa, cada tren andando en su posición GPS; en Cómo llegar, el próximo tren de cada tramo y a qué hora llega. También las alertas del momento de su app (interrupciones, demoras), cada 5 minutos. Cuando la fuente no sigue al tren, se muestra el horario programado. Gracias a Ariel Aguirre por el proyecto y a Enzo Notario por su documentación.',
        when: 'live',
      },
    ],
  },
  {
    id: 'colectivos',
    title: 'Colectivos y EcoBici',
    icon: 'COLECTIVO',
    items: [
      {
        what: 'Colectivos en vivo y alertas',
        source: API_TRANSPORTE,
        url: API_TRANSPORTE_URL,
        detail:
          'Posición de cada colectivo, alertas de servicio de cada línea y, para las paradas guardadas, cuánto le falta al próximo colectivo (con los minutos entre paradas del recorrido).',
        when: 'live',
      },
      {
        what: 'Recorridos y paradas',
        source: 'API Transporte GCBA, GTFS de colectivos',
        url: API_TRANSPORTE_URL,
        detail: 'Recorrido y paradas de cada línea, y el tiempo entre parada y parada.',
        when: 'daily',
      },
      {
        what: 'EcoBici',
        source: API_TRANSPORTE,
        url: API_TRANSPORTE_URL,
        detail: 'Bicis y anclajes libres en cada estación.',
        when: 'live',
      },
    ],
  },
  {
    id: 'accesos',
    title: 'Accesos y estacionamiento',
    icon: 'ACCESOS',
    items: [
      {
        what: 'Tránsito en los accesos',
        source: 'TomTom Traffic',
        url: 'https://www.tomtom.com/products/traffic-apis/',
        detail: 'Velocidad actual y normal de cada tramo, en cada mano (hacia CABA y hacia Provincia).',
        when: { every: '20 min' },
      },
      {
        what: 'Cortes de tránsito',
        source: 'Noticias del Gobierno de la Ciudad de Buenos Aires',
        url: 'https://buenosaires.gob.ar/noticias-relacionadas/Tr%C3%A1nsito',
        detail:
          'Las noticias que anuncian cortes, desvíos o zonas cerradas (eventos, maratones, operativos), con enlace a cada una; se muestran una semana desde que se publican. Los eventos grandes se cargan además a mano, con calles y horarios.',
        when: { every: '1 h' },
      },
      {
        what: 'Peajes',
        source: 'Resoluciones de Vialidad Nacional y de la Provincia (vía La Nación y Ámbito)',
        url: 'https://www.argentina.gob.ar/obras-publicas/vialidad-nacional',
        detail: 'Valores para autos con y sin TelePASE; cada cuadro indica su vigencia.',
        when: 'manual',
      },
      {
        what: 'Estacionamiento en la Ciudad',
        source: 'Buenos Aires Data — Garajes Comerciales, Estacionamientos concesionados y Estacionamientos de Motos',
        url: 'https://data.buenosaires.gob.ar/dataset/garajes-comerciales',
        detail:
          'Garajes y playas de toda la Ciudad, y cocheras y lugares en la calle para motos del microcentro (datos del 22/06/2026).',
        when: 'fixed',
      },
      {
        what: 'Estacionamiento en el conurbano',
        source: 'OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL)',
        url: OSM_URL,
        detail:
          'Playas y garajes de los 40 partidos del AMBA, con el partido de cada uno. Son datos colaborativos, no oficiales: los municipios no publican datos abiertos de estacionamiento.',
        when: 'fixed',
      },
    ],
  },
  {
    id: 'aeropuertos',
    title: 'Aeropuertos y clima',
    icon: 'AEROPUERTO',
    items: [
      {
        what: 'Aviones en vivo',
        source: 'adsb.lol',
        url: 'https://adsb.lol/',
        detail:
          'Posición, altura y velocidad de los aviones alrededor de Buenos Aires, con las señales que reciben antenas voluntarias. Datos abiertos bajo licencia ODbL.',
        when: 'live',
      },
      {
        what: 'Pronóstico del clima',
        source: 'Open-Meteo (datos con licencia CC BY 4.0)',
        url: 'https://open-meteo.com/',
        detail: 'Temperatura, lluvia y viento hora por hora para Tu día, a partir de modelos meteorológicos.',
        when: { every: '45 min' },
      },
      {
        what: 'Alertas meteorológicas',
        source: 'Servicio Meteorológico Nacional (feed CAP)',
        url: 'https://www.smn.gob.ar/alertas',
        detail: 'Alertas amarillas, naranjas y rojas por tormentas, lluvias y calor que afectan al AMBA.',
        when: { every: '10 min' },
      },
    ],
  },
  {
    id: 'general',
    title: 'Tarifas, direcciones y mapas',
    icon: 'COMO_LLEGAR',
    items: [
      {
        what: 'Tarifas',
        source: 'Red SUBE (Argentina.gob.ar) y Gobierno de la Ciudad',
        url: 'https://www.argentina.gob.ar/redsube/tarifas-de-transporte-publico-amba',
        detail: 'Valores con SUBE registrada.',
        when: 'manual',
      },
      {
        what: 'Direcciones',
        source: 'Georef, Servicio de Normalización de Datos Geográficos (datos.gob.ar)',
        url: 'https://datosgobar.github.io/georef-ar-api/',
        detail:
          'Confirma que la dirección de Casa, Trabajo y los otros lugares exista en el AMBA y busca las direcciones de Cómo llegar, para sumar las estaciones cercanas.',
        when: 'search',
      },
      {
        what: 'Mapas',
        source: 'OpenStreetMap',
        url: OSM_URL,
        detail: '© colaboradores de OpenStreetMap, con licencia ODbL.',
        when: null,
      },
    ],
  },
]

const WHEN_LABELS = {
  live: 'En vivo',
  daily: 'Una vez por día',
  manual: 'A mano',
  fixed: 'Fijo',
  search: 'Al buscar',
}

/** La etiqueta de cada cuanto se actualiza un dato ("En vivo", "Cada 5 min"), o null. */
export function whenLabel(when) {
  if (!when) return null
  if (typeof when === 'object') return when.every ? `Cada ${when.every}` : null
  return WHEN_LABELS[when] ?? null
}
