const TIME_ZONE = 'America/Buenos_Aires'

/** Hora (0-23) en Buenos Aires, sin importar la zona horaria del dispositivo. */
export function hourInBuenosAires(date) {
  const hour = new Intl.DateTimeFormat('es-AR', { hour: 'numeric', hourCycle: 'h23', timeZone: TIME_ZONE }).format(date)
  return Number(hour)
}

/** Buenos dias de 6 a 12:59, buenas tardes de 13 a 19:59 y buenas noches el resto. */
export function greetingFor(date) {
  const hour = hourInBuenosAires(date)
  if (hour >= 6 && hour < 13) return 'Buenos días'
  if (hour >= 13 && hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export const MAX_NAME_LENGTH = 30

/** "  guille  " -> "Guille". Vacio si no queda nada. */
export function cleanName(name) {
  const text = (name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH)
  return text ? text.charAt(0).toLocaleUpperCase('es-AR') + text.slice(1) : ''
}

/** "domingo 25 de octubre" */
export function longToday(date) {
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE })
}
