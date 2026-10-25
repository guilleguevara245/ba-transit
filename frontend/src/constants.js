export const MODE_LABELS = {
  SUBTE: 'Subte',
  TREN: 'Tren',
  PREMETRO: 'Premetro',
  COLECTIVO: 'Colectivo',
  AEROPUERTO: 'Aeropuerto',
}

export const ALERT_TYPE_LABELS = {
  OBRA: 'Obra',
  DEMORA: 'Demora',
  INTERRUPCION: 'Interrupción',
  DESVIO: 'Desvío',
}

// Para titulos y tarjetas que hablan del modo en general ("Trenes").
export const MODE_LABELS_PLURAL = {
  SUBTE: 'Subtes',
  TREN: 'Trenes',
  PREMETRO: 'Premetro',
  COLECTIVO: 'Colectivos',
  AEROPUERTO: 'Aeropuertos',
}

// Slug de cada modo en la URL (/modos/trenes).
export const MODE_SLUGS = {
  SUBTE: 'subtes',
  TREN: 'trenes',
  PREMETRO: 'premetro',
  COLECTIVO: 'colectivos',
  AEROPUERTO: 'aeropuertos',
}

export function modeFromSlug(slug) {
  return Object.keys(MODE_SLUGS).find((mode) => MODE_SLUGS[mode] === slug) ?? null
}
