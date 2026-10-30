import { describe, expect, it } from 'vitest'
import { headline, hourLabel, hourSlots, isRainy, sunText, uvText } from './dayWeather.js'

/** 12 horas desde las 8 de hoy; cambios: { indice: { ...campos } }. */
function forecast(changes = {}, start = 8) {
  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = start + i
    const day = h >= 24 ? '31' : '30'
    return {
      time: `2026-10-${day}T${String(h % 24).padStart(2, '0')}:00`,
      temperature: 20,
      feelsLike: 20,
      rainChance: 5,
      rain: 0,
      code: 1,
      wind: 10,
      isDay: true,
      ...(changes[i] ?? {}),
    }
  })
  return { current: { time: hours[0].time.replace(':00', ':20') }, hours }
}

const casa = { id: 'casa', label: 'Casa' }
const trabajo = { id: 'trabajo', label: 'Trabajo' }

describe('hourLabel', () => {
  it('dice la hora y si es mañana', () => {
    expect(hourLabel('2026-10-30T17:00', '2026-10-30T08:20')).toBe('a las 17')
    expect(hourLabel('2026-10-30T01:00', '2026-10-30T00:20')).toBe('a la 1')
    expect(hourLabel('2026-10-31T07:00', '2026-10-30T22:20')).toBe('mañana a las 7')
  })
})

describe('headline', () => {
  it('sin nada especial: sin lluvia', () => {
    expect(headline([{ place: casa, forecast: forecast() }])).toEqual({
      tone: 'ok',
      text: 'Sin lluvia en las próximas 12 horas.',
    })
  })

  it('lluvia mas tarde, con un solo lugar no lo nombra', () => {
    expect(headline([{ place: casa, forecast: forecast({ 7: { rainChance: 70 } }) }])).toEqual({
      tone: 'rain',
      text: 'Lluvia a las 15: llevá paraguas.',
    })
  })

  it('si llueve a la vuelta en Trabajo, eso va primero', () => {
    const result = headline([
      { place: casa, forecast: forecast() },
      { place: trabajo, forecast: forecast({ 10: { rainChance: 80, rain: 1.2 } }) },
    ])
    expect(result).toEqual({ tone: 'rain', text: 'Llueve a la vuelta (18 h) en Trabajo: llevá paraguas.' })
  })

  it('lloviendo ahora: hasta cuando', () => {
    const f = forecast({ 0: { rainChance: 90, rain: 2 }, 1: { rainChance: 80 }, 2: { rainChance: 20 } })
    expect(headline([{ place: casa, forecast: f }]).text).toBe('Está lloviendo; para cerca de las 10.')
  })

  it('la tormenta gana y nombra el lugar si hay dos', () => {
    const result = headline([
      { place: casa, forecast: forecast({ 3: { rainChance: 60 } }) },
      { place: trabajo, forecast: forecast({ 5: { code: 95, rainChance: 90 } }) },
    ])
    expect(result).toEqual({ tone: 'storm', text: 'Tormenta a las 13 en Trabajo. Salí con tiempo.' })
  })

  it('calor, frio y viento', () => {
    expect(headline([{ place: casa, forecast: forecast({ 6: { feelsLike: 35.4 } }) }]).text).toBe(
      'Mucho calor: 35° de sensación a las 14. Llevá agua.',
    )
    expect(headline([{ place: casa, forecast: forecast({ 0: { feelsLike: 3 } }) }]).tone).toBe('cold')
    expect(headline([{ place: casa, forecast: forecast({ 4: { wind: 48 } }) }]).text).toBe(
      'Viento fuerte: 48 km/h a las 12.',
    )
  })

  it('sin pronostico no hay frase', () => {
    expect(headline([{ place: casa, forecast: null }])).toBeNull()
  })

  it('lluvia: por probabilidad, por milimetros o por codigo con chance media', () => {
    expect(isRainy({ code: 1, rainChance: 50, rain: 0 })).toBe(true)
    expect(isRainy({ code: 3, rainChance: 10, rain: 0.5 })).toBe(true)
    expect(isRainy({ code: 61, rainChance: 40, rain: 0 })).toBe(true)
    expect(isRainy({ code: 61, rainChance: 20, rain: 0 })).toBe(false)
  })
})

describe('datos del recuadro', () => {
  it('seis horarios: ahora y cada 2 horas', () => {
    const slots = hourSlots(forecast())
    expect(slots.map((s) => s.label)).toEqual(['Ahora', '10 h', '12 h', '14 h', '16 h', '18 h'])
  })

  it('el sol: atardecer de dia, amanecer de noche', () => {
    const today = { sunrise: '2026-10-30T05:55', sunset: '2026-10-30T19:22', sunriseTomorrow: '2026-10-31T05:54' }
    expect(sunText({ current: { time: '2026-10-30T15:00' }, today })).toBe('Atardece 19:22')
    expect(sunText({ current: { time: '2026-10-30T21:00' }, today })).toBe('Amanece 5:54')
    expect(sunText({ current: { time: '2026-10-30T04:00' }, today })).toBe('Amanece 5:55')
  })

  it('UV solo si es alto y es de dia antes de las 16', () => {
    expect(uvText({ current: { time: '2026-10-30T10:00', isDay: true }, today: { uvMax: 8.4 } })).toBe(
      'UV 8 al mediodía',
    )
    expect(uvText({ current: { time: '2026-10-30T17:00', isDay: true }, today: { uvMax: 8.4 } })).toBeNull()
    expect(uvText({ current: { time: '2026-10-30T10:00', isDay: true }, today: { uvMax: 4 } })).toBeNull()
  })
})
