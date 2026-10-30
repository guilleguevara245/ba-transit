import { lineSlug, textSlug } from '../utils/lineSlug.js'
import { PHOTO_LIST } from './stationPhotoList.js'

/**
 * Fotos de las estaciones, de Wikimedia Commons (licencias libres). Se
 * guardan en el sitio (public/estaciones/...), recortadas y achicadas, asi la
 * pagina no le pide nada a otro servidor. Los creditos se muestran todos
 * juntos en "Acerca de".
 *
 * Clave: "<linea>/<estacion>" con los mismos slugs de las direcciones del
 * sitio ("subte-b/medrano", "roca/gerli"). Cada foto:
 *   name: la estacion y su linea, para los creditos ("Medrano, Línea B")
 *   file: la imagen en el sitio ("/estaciones/subte-b/medrano.jpg")
 *   author: autor como figura en Commons
 *   license: "CC BY-SA 4.0", "CC BY 2.0", "Dominio público"...
 *   licenseUrl: el texto de la licencia (opcional en dominio publico)
 *   source: la ficha del archivo en Commons
 */
export const STATION_PHOTOS = PHOTO_LIST

/** "subte-b/medrano": la clave de la foto de una estacion. */
export function photoKey(station) {
  const line = lineSlug({ mode: station.lineMode, code: station.lineCode })
  return line && station.stationName ? `${line}/${textSlug(station.stationName)}` : null
}

/** Los creditos para "Acerca de", ordenados por estacion. */
export function photoCredits(photos = STATION_PHOTOS) {
  return Object.values(photos).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** La foto de la estacion, o null si todavia no tiene. */
export function photoFor(station, photos = STATION_PHOTOS) {
  const key = photoKey(station)
  return (key && photos[key]) || null
}
