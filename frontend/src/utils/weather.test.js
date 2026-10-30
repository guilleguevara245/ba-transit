import { describe, expect, it } from 'vitest'
import { describeWeather } from './weather.js'

describe('describeWeather', () => {
  it('agrupa los codigos de la OMM', () => {
    expect(describeWeather(0).label).toBe('Despejado')
    expect(describeWeather(45).label).toBe('Niebla')
    expect(describeWeather(95).label).toBe('Tormenta')
    expect(describeWeather(1234).label).toBe('Sin datos')
  })

  it('de noche usa la luna en lugar del sol', () => {
    expect(describeWeather(0, true).icon).toBe('clear')
    expect(describeWeather(0, false).icon).toBe('clear-night')
    expect(describeWeather(2, false).icon).toBe('partly-night')
    expect(describeWeather(61, false).icon).toBe('rain')
  })
})
