/**
 * Descuento Red SUBE en el AMBA (vigente desde agosto de 2026): dentro de
 * las 2 horas desde el primer pago, el 2do viaje tiene 50% de descuento y
 * del 3ro al 5to, 75%. Desde agosto de 2026 no tienen descuento el subte
 * despues de un tren ni un colectivo provincial como segundo viaje.
 * Fuente: Infobae (10/08/2026) y Preguntas frecuentes de Red SUBE.
 */
export const RED_SUBE_WINDOW_MINUTES = 120
export const MAX_DISCOUNTED_TRIPS = 5

/** Porcentaje que se paga en el viaje numero n (1, 2, 3...) de una cadena. */
export function payPercent(tripNumber) {
  if (tripNumber <= 1 || tripNumber > MAX_DISCOUNTED_TRIPS) return 100
  return tripNumber === 2 ? 50 : 25
}

/**
 * Simula una cadena de viajes: [{ mode, price }]. Si un viaje no tiene
 * descuento por las excepciones (subte despues de tren), se cobra entero
 * y la cadena sigue contando. Devuelve el detalle y el total.
 */
export function simulateRedSube(trips) {
  let total = 0
  const detail = trips.map((trip, index) => {
    const number = index + 1
    const previous = trips[index - 1]
    const excluded = previous && previous.mode === 'TREN' && trip.mode === 'SUBTE'
    const percent = excluded ? 100 : payPercent(number)
    const paid = Math.round(trip.price * percent) / 100
    total += paid
    return { ...trip, number, percent, paid, excluded }
  })
  return { detail, total: Math.round(total * 100) / 100, full: trips.reduce((sum, t) => sum + t.price, 0) }
}
