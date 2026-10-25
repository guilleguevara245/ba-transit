/**
 * Codigos de tiempo de la OMM que devuelve Open-Meteo (weather_code),
 * agrupados en descripciones cortas.
 */
const GROUPS = [
  { codes: [0], label: 'Despejado', icon: '☀️' },
  { codes: [1, 2], label: 'Parcialmente nublado', icon: '⛅' },
  { codes: [3], label: 'Nublado', icon: '☁️' },
  { codes: [45, 48], label: 'Niebla', icon: '🌫️' },
  { codes: [51, 53, 55, 56, 57], label: 'Llovizna', icon: '🌦️' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: 'Lluvia', icon: '🌧️' },
  { codes: [71, 73, 75, 77, 85, 86], label: 'Nieve', icon: '🌨️' },
  { codes: [95, 96, 99], label: 'Tormenta', icon: '⛈️' },
]

export function describeWeather(code) {
  return GROUPS.find((g) => g.codes.includes(code)) ?? { label: 'Sin datos', icon: '·' }
}

/** URL de Open-Meteo para el tiempo actual en un punto. */
export function weatherUrl(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,wind_speed_10m,weather_code',
    timezone: 'America/Argentina/Buenos_Aires',
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}
