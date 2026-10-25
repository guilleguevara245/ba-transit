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

/** $ 994,15 -> "$994" (los centavos no le sirven a quien mira el cartel). */
export function formatToll(value) {
  return `$${Math.round(value).toLocaleString('es-AR')}`
}
