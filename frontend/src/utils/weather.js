/**
 * Codigos de tiempo de la OMM que devuelve Open-Meteo (weather_code),
 * agrupados en descripciones cortas. "icon" es el dibujo de WeatherIcon;
 * de noche (is_day = 0) el sol se cambia por la luna.
 */
const GROUPS = [
  { codes: [0], label: 'Despejado', icon: 'clear' },
  { codes: [1, 2], label: 'Parcialmente nublado', icon: 'partly' },
  { codes: [3], label: 'Nublado', icon: 'cloud' },
  { codes: [45, 48], label: 'Niebla', icon: 'fog' },
  { codes: [51, 53, 55, 56, 57], label: 'Llovizna', icon: 'drizzle' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: 'Lluvia', icon: 'rain' },
  { codes: [71, 73, 75, 77, 85, 86], label: 'Nieve', icon: 'snow' },
  { codes: [95, 96, 99], label: 'Tormenta', icon: 'storm' },
]

const NIGHT_ICONS = { clear: 'clear-night', partly: 'partly-night' }

export function describeWeather(code, isDay = true) {
  const group = GROUPS.find((g) => g.codes.includes(code))
  if (!group) return { label: 'Sin datos', icon: null }
  return { label: group.label, icon: isDay ? group.icon : (NIGHT_ICONS[group.icon] ?? group.icon) }
}

/** URL de Open-Meteo para el tiempo actual en un punto. */
export function weatherUrl(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,wind_speed_10m,weather_code,is_day',
    timezone: 'America/Argentina/Buenos_Aires',
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}
