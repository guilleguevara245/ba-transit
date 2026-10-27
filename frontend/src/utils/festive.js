import { holidayOn, localDateKey } from './holidays.js'

/**
 * Fechas especiales del inicio: un saludo propio ("Feliz Navidad"), una
 * frase en lugar de "Así está el transporte ahora" y un adorno en el logo.
 *
 * greeting: reemplaza "Buenos días"; withName: si va seguido del nombre.
 * decoration: 'escarapela' | 'gorro' | 'confeti' | null.
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

/** Por nombre de feriado, para los que cambian de fecha (carnaval, Pascua, San Martín). */
const BY_HOLIDAY = [
  [/carnaval/i, { greeting: 'Feliz Carnaval', phrase: 'Murgas y cortes en los barrios. Así está el transporte.', decoration: 'confeti' }],
  [/viernes santo/i, { phrase: 'Fin de semana largo de Pascua. Así está el transporte.' }],
  [/san mart[ií]n/i, { phrase: 'Homenaje al Libertador. Así está el transporte hoy.', decoration: 'escarapela' }],
]

const NONE = { greeting: null, withName: true, phrase: null, decoration: null, wave: false }

export function festiveFor(date = new Date()) {
  const key = localDateKey(date).slice(5) // MM-DD
  const holiday = holidayOn(date)
  let match = BY_DAY[key]
  if (!match && holiday) match = BY_HOLIDAY.find(([pattern]) => pattern.test(holiday))?.[1]
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
  // Otro feriado: lo dice, sin chistes.
  if (!match && holiday) match = { phrase: `Hoy es feriado: ${holiday}. Así está el transporte.` }
  return { ...NONE, ...match }
}
