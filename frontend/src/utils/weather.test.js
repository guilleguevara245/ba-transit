import { describe, expect, it } from 'vitest'
import { describeWeather, weatherUrl } from './weather.js'

describe('describeWeather', () => {
  it('agrupa los codigos de la OMM', () => {
    expect(describeWeather(0).label).toBe('Despejado')
    expect(describeWeather(45).label).toBe('Niebla')
    expect(describeWeather(95).label).toBe('Tormenta')
    expect(describeWeather(1234).label).toBe('Sin datos')
  })
})

describe('weatherUrl', () => {
  it('pide temperatura, viento y estado en hora argentina', () => {
    const url = weatherUrl(-34.55889, -58.41639)
    expect(url).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/)
    expect(url).toContain('current=temperature_2m%2Cwind_speed_10m%2Cweather_code')
  })
})
