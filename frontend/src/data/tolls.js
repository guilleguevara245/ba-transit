/**
 * Peajes para autos (hasta 2 ejes y 2,10 m de alto) en los accesos.
 * Cada par es [hora no pico, hora pico]. Los valores cambian seguido:
 * al actualizarlos, cambiar tambien "since" y "source".
 *
 * Fuentes:
 *  - Buenos Aires - La Plata: Res. provincial del 09/10/2026, publicada por
 *    Ambito y MDZ (09/10/2026). Vigente desde el 10/10/2026.
 *  - Acceso Norte y Acceso Oeste: Res. 297/2026 de Vialidad Nacional, publicada
 *    por La Nacion (05/03/2026). Vigente desde el 07/03/2026. "Sin TelePASE"
 *    es el pago manual en efectivo.
 *  - Riccheri: Res. 248/2026 de Vialidad Nacional, publicada por La Nacion
 *    (24/02/2026). Vigente desde el 26/02/2026; mismo valor con y sin TelePASE.
 */
export const TOLLS = {
  'la-plata': {
    since: '2026-10-10',
    source: 'https://www.ambito.com/informacion-general/aumenta-el-peaje-la-autopista-buenos-aires-la-plata-los-nuevos-valores-n6331892',
    plazas: [
      { name: 'Hudson, hacia CABA (incluye Dock Sud)', telepase: [2593.53, 3241.92], manual: [2600, 3400] },
      { name: 'Dock Sud – Hudson, hacia La Plata', telepase: [1296.77, 1620.96], manual: [1300, 1700] },
    ],
  },
  norte: {
    since: '2026-03-07',
    source: 'https://www.lanacion.com.ar/autos/aumentan-los-peajes-en-panamericana-y-acceso-oeste-pagar-en-efectivo-costara-mas-del-doble-nid05032026/',
    plazas: [{ name: 'Todas las cabinas', telepase: [994.15, 1192.99], manual: [2000, 2400] }],
  },
  oeste: {
    since: '2026-03-07',
    source: 'https://www.lanacion.com.ar/autos/aumentan-los-peajes-en-panamericana-y-acceso-oeste-pagar-en-efectivo-costara-mas-del-doble-nid05032026/',
    plazas: [{ name: 'Todas las cabinas', telepase: [994.15, 1192.99], manual: [2000, 2400] }],
  },
  riccheri: {
    since: '2026-02-26',
    source: 'https://www.lanacion.com.ar/economia/aumentan-los-peajes-en-rutas-nacionales-y-la-autopista-riccheri-como-quedan-las-tarifas-desde-este-nid24022026/',
    plazas: [{ name: 'Autopista Riccheri', telepase: [1300, 1500], manual: [1300, 1500] }],
    note: 'Ezeiza – Cañuelas: consultar el cuadro de Corredores Viales.',
  },
}

/**
 * Horas pico de cada acceso. "weekdays" son los dias habiles (lunes a
 * viernes sin feriados); en Panamericana y Acceso Oeste los fines de semana
 * y feriados tambien hay pico, pero en un solo sentido por franja.
 *  - Norte y Oeste: lun a vie de 7 a 11 y de 16 a 20 (ambos sentidos); sab,
 *    dom y feriados de 11 a 15 hacia Provincia y de 17 a 21 hacia CABA
 *    (Pilar a Diario, cuadro de Autopistas del Sol).
 *  - Buenos Aires - La Plata: dias habiles de 7 a 10 y de 17 a 20 (0221,
 *    cuadro de AUBASA).
 *  - Riccheri: lun a vie de 7 a 11 y de 16 a 20, ambos sentidos
 *    (Res. 78-E/2018 de Vialidad Nacional).
 */
const NORTE_OESTE = {
  weekdays: [[7, 11], [16, 20]],
  weekends: [
    { from: 11, to: 15, towards: 'Provincia' },
    { from: 17, to: 21, towards: 'CABA' },
  ],
  text: 'Pico: lun a vie de 7 a 11 y de 16 a 20; sáb, dom y feriados de 11 a 15 hacia Provincia y de 17 a 21 hacia CABA.',
}

export const PEAK_HOURS = {
  'la-plata': {
    weekdays: [[7, 10], [17, 20]],
    weekends: [],
    text: 'Pico: días hábiles de 7 a 10 y de 17 a 20.',
  },
  norte: NORTE_OESTE,
  oeste: NORTE_OESTE,
  riccheri: {
    weekdays: [[7, 11], [16, 20]],
    weekends: [],
    text: 'Pico: lun a vie de 7 a 11 y de 16 a 20.',
  },
}

/**
 * Si ahora es hora pico en ese acceso: { peak, towards }. towards es el
 * sentido cuando el pico rige en uno solo (fines de semana en Norte y
 * Oeste); null si rige en ambos. isHoliday dice si la fecha es feriado.
 */
export function peakNow(accessId, date, isHoliday = false) {
  const rules = PEAK_HOURS[accessId]
  if (!rules) return { peak: false, towards: null }
  const day = date.getDay()
  const hour = date.getHours() + date.getMinutes() / 60
  const businessDay = day >= 1 && day <= 5 && !isHoliday
  if (businessDay) {
    const peak = rules.weekdays.some(([from, to]) => hour >= from && hour < to)
    return { peak, towards: null }
  }
  const band = rules.weekends.find((b) => hour >= b.from && hour < b.to)
  return band ? { peak: true, towards: band.towards } : { peak: false, towards: null }
}

/** $ 994,15 -> "$994" (los centavos no le sirven a quien mira el cartel). */
export function formatToll(value) {
  return `$${Math.round(value).toLocaleString('es-AR')}`
}
