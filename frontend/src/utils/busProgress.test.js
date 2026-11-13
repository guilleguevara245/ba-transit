import { describe, expect, it } from 'vitest'
import { nextStop } from './busProgress.js'

/** Diez paradas en linea recta hacia el este, unos 180 m entre cada una y 2 minutos entre paradas. */
const straight = {
  stops: Array.from({ length: 10 }, (_, i) => ({ id: `P${i}`, name: `Parada ${i}`, latitude: -34.6, longitude: -58.45 + i * 0.002 })),
  minutes: Array.from({ length: 10 }, (_, i) => i * 2),
  shape: [
    [-34.6, -58.45],
    [-34.6, -58.45 + 9 * 0.002],
  ],
}

describe('nextStop', () => {
  it('la proxima parada y los minutos que faltan', () => {
    // Entre la 3 y la 4, mas cerca de la 3: le faltan unos 1,6 min a la 4.
    const next = nextStop(straight, -34.6, -58.45 + 3.2 * 0.002)
    expect(next.index).toBe(4)
    expect(next.stop.name).toBe('Parada 4')
    expect(next.minutes).toBe(2)
    expect(next.arriving).toBe(false)
  })

  it('al lado de la parada esta llegando', () => {
    const next = nextStop(straight, -34.6, -58.45 + 3.7 * 0.002)
    expect(next.index).toBe(4)
    expect(next.arriving).toBe(true)
    expect(next.minutes).toBe(0)
  })

  it('la posicion vieja descuenta el tiempo', () => {
    // De la 2 a la 7 son 10 minutos... pero aca se mira solo la proxima: de la 2,1 a la 3 son 1,8 min, menos 1.
    expect(nextStop(straight, -34.6, -58.45 + 2.1 * 0.002, 60).minutes).toBe(1)
  })

  it('a unas cuadras del recorrido (garage o terminal) no esta en el recorrido', () => {
    expect(nextStop(straight, -34.597, -58.45 + 6 * 0.002)).toBeNull()
  })

  it('sin minutos del horario solo dice la parada', () => {
    const next = nextStop({ ...straight, minutes: null }, -34.6, -58.45 + 3.2 * 0.002)
    expect(next.stop.name).toBe('Parada 4')
    expect(next.minutes).toBeNull()
  })
})
