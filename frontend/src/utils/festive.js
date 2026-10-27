import { holidayOn, localDateKey } from './holidays.js'

/**
 * Fechas especiales del inicio: un saludo propio ("Feliz Navidad"), una
 * frase en lugar de "Así está el transporte ahora" y un adorno en el logo.
 *
 * greeting: reemplaza "Buenos días"; withName: si va seguido del nombre.
 * decoration: 'escarapela' | 'gorro' | 'confeti' | 'corazones' | null.
 * wave: mano que saluda al lado del saludo (Día del Amigo).
 *
 * Las fechas de memoria (24 de marzo, 2 de abril) van sin chistes ni adornos.
 */
const BY_DAY = {
  '01-01': {
    greeting: 'Feliz Año Nuevo',
    phrase: 'Arrancamos el año con recalentado y en movimiento. Así está el transporte hoy.',
    decoration: 'confeti',
  },
  '03-24': {
    greeting: 'Nunca más',
    withName: false,
    phrase: 'Día Nacional de la Memoria por la Verdad y la Justicia.',
  },
  '04-02': { phrase: 'Día del Veterano y de los Caídos en la Guerra de Malvinas.' },
  '05-01': {
    greeting: 'Feliz Día del Trabajador',
    phrase: 'Hoy descansa la mayoría; el transporte, no. Así está hoy.',
  },
  '05-18': { phrase: 'Día de la Escarapela: hoy, celeste y blanco en el pecho. Así está el transporte.', decoration: 'escarapela' },
  '05-25': {
    greeting: 'Feliz 25 de Mayo',
    phrase: 'Hoy se viaja con empanadas y locro. Así está el transporte.',
    decoration: 'escarapela',
  },
  '06-20': {
    greeting: 'Feliz Día de la Bandera',
    phrase: 'Celeste, blanco y en movimiento. Así está el transporte hoy.',
    decoration: 'escarapela',
  },
  '07-09': {
    greeting: 'Feliz Día de la Independencia',
    phrase: 'Independientes, pero con SUBE. Así está el transporte hoy.',
    decoration: 'escarapela',
  },
  '07-20': {
    greeting: 'Feliz Día del Amigo',
    phrase: 'Gracias por viajar con nosotros: quienes usan BA Transit son nuestros amigos.',
    wave: true,
  },
  '09-21': {
    greeting: 'Feliz primavera',
    phrase: 'Día del Estudiante y de la primavera: hoy los parques se llenan. Así está el transporte.',
  },
  '12-08': {
    phrase: 'Hoy se arma el arbolito: ¿ya bajaste los adornos? Así está el transporte.',
    decoration: 'gorro',
  },
  '12-24': {
    greeting: 'Feliz Nochebuena',
    phrase: 'Últimos regalos y mucho tránsito: fijate el último tren.',
    decoration: 'gorro',
  },
  '12-25': {
    greeting: 'Feliz Navidad',
    phrase: 'Día de recalentado y de pasear tranquilo. Así está el transporte hoy.',
    decoration: 'gorro',
  },
  '12-31': {
    greeting: 'Feliz fin de año',
    phrase: 'Último viaje del año: revisá el último tren antes del brindis.',
    decoration: 'gorro',
  },
}

/**
 * Dias populares y del transporte: van despues de los feriados (si un
 * feriado cae el mismo dia, gana el feriado).
 */
const POPULAR_BY_DAY = {
  '02-14': {
    greeting: 'Feliz San Valentín',
    phrase: 'Que el amor no espere en el andén: fijate cuándo pasa el próximo tren.',
    decoration: 'corazones',
  },
  '04-23': { greeting: 'Feliz Día del Libro', phrase: 'El viaje en subte es buen momento para leer. Así está el transporte.' },
  '06-03': { greeting: 'Feliz Día de la Bicicleta', phrase: 'Día de la bici: fijate dónde hay EcoBici disponibles.' },
  '06-07': { greeting: 'Feliz Día del Periodista', phrase: 'Así está el transporte hoy, con información chequeada.' },
  // Redactado para que el nombre quede bien: "Buenos Aires cumple años, Nicolás".
  '06-11': {
    greeting: 'Buenos Aires cumple años',
    phrase: 'Hoy se celebra la fundación de la Ciudad (1580). Así está el transporte.',
  },
  '08-30': {
    greeting: 'Feliz Día del Ferroviario',
    phrase: 'Hace más de 160 años salía La Porteña, el primer tren argentino. Así están los trenes hoy.',
  },
  '09-11': { greeting: 'Feliz Día del Maestro', phrase: 'Gracias, maestras y maestros. Así está el transporte.' },
  '09-24': {
    greeting: 'Feliz Día del Colectivero',
    phrase: 'Un invento porteño desde 1928: gracias a quienes manejan todos los días.',
  },
  '10-11': { phrase: 'Día del Dulce de Leche: el mejor invento argentino. Así está el transporte.' },
  '10-31': { greeting: 'Feliz Halloween', phrase: 'Nada da más miedo que el subte en hora pico. Así está el transporte.' },
  '11-10': { greeting: 'Feliz Día de la Tradición', phrase: 'Mate, guitarra y un buen viaje. Así está el transporte.' },
  '11-30': { greeting: 'Feliz Día del Mate', phrase: 'El termo va en la mochila. Así está el transporte.' },
  '12-01': {
    greeting: 'El subte cumple años',
    phrase: 'Desde 1913, el primero de Latinoamérica. Así está el transporte hoy.',
  },
  '12-11': { greeting: 'Feliz Día del Tango', phrase: 'Buenos Aires se mueve a otro ritmo. Así está el transporte.' },
}

/** Tercer domingo del mes: Dia del Padre (junio) y de la Madre (octubre). */
function movableDay(key, date) {
  const [y, m, d] = localDateKey(date).split('-').map(Number)
  const sunday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0
  if (!sunday || d < 15 || d > 21) return null
  if (key.startsWith('06-')) return { greeting: 'Feliz Día del Padre', phrase: 'Hoy se viaja a almorzar con papá. Así está el transporte.' }
  if (key.startsWith('10-')) return { greeting: 'Feliz Día de la Madre', phrase: 'Hoy se viaja a ver a mamá: salí con tiempo.' }
  return null
}

/** Por nombre de feriado, para los que cambian de fecha (carnaval, Pascua, San Martín). */
const BY_HOLIDAY = [
  [/carnaval/i, { greeting: 'Feliz Carnaval', phrase: 'Murgas y cortes en los barrios. Así está el transporte.', decoration: 'confeti' }],
  [/viernes santo/i, { greeting: 'Felices Pascuas', phrase: 'Fin de semana largo de Pascua. Así está el transporte.' }],
  [/san mart[ií]n/i, { phrase: 'Homenaje al Libertador. Así está el transporte hoy.', decoration: 'escarapela' }],
]

const DAY_MS = 24 * 60 * 60 * 1000

const NONE = { greeting: null, withName: true, phrase: null, decoration: null, wave: false }

export function festiveFor(date = new Date()) {
  const key = localDateKey(date).slice(5) // MM-DD
  const holiday = holidayOn(date)
  let match = BY_DAY[key]
  if (!match && holiday) match = BY_HOLIDAY.find(([pattern]) => pattern.test(holiday))?.[1]
  // Sabado y domingo de Pascua (el feriado es el viernes, uno o dos dias antes).
  if (!match && [1, 2].some((days) => /viernes santo/i.test(holidayOn(new Date(date.getTime() - days * DAY_MS)) ?? ''))) {
    match = { greeting: 'Felices Pascuas', phrase: 'Fin de semana largo de Pascua. Así está el transporte.' }
  }
  // Otro feriado: lo dice, sin chistes (gana sobre los dias populares).
  if (!match && holiday) match = { phrase: `Hoy es feriado: ${holiday}. Así está el transporte.` }
  if (!match) match = movableDay(key, date) ?? POPULAR_BY_DAY[key]
  // Diciembre: gorrito todo el mes, con frase de fiestas los dias sin una propia.
  if (!match && key.startsWith('12-')) {
    match = {
      phrase:
        key > '12-25'
          ? 'Semana de fiestas: salí con tiempo. Así está el transporte.'
          : 'Se vienen las fiestas: salí con tiempo. Así está el transporte.',
      decoration: 'gorro',
    }
  }
  // En diciembre el gorro va siempre, aunque el dia tenga su propia frase.
  if (match && key.startsWith('12-') && !match.decoration) match = { ...match, decoration: 'gorro' }
  return { ...NONE, ...match }
}
