import { describe, expect, it } from 'vitest'
import {
  accessGroups,
  accessShortName,
  delayMinutes,
  lengthKm,
  problemsTitle,
  speedPercent,
  speedText,
  trafficProblems,
  trafficStatus,
  worstStatus,
} from './traffic.js'

describe('trafficStatus', () => {
  it('traduce los codigos y cae en "Sin datos" si no lo conoce', () => {
    expect(trafficStatus('DEMORADO').label).toBe('Demorado')
    expect(trafficStatus('OTRO').label).toBe('Sin datos')
  })
})

describe('speedPercent', () => {
  it('calcula el porcentaje de la velocidad libre', () => {
    expect(speedPercent({ currentSpeed: 45, freeFlowSpeed: 90 })).toBe(50)
    expect(speedPercent({ currentSpeed: 120, freeFlowSpeed: 100 })).toBe(100)
    expect(speedPercent({ currentSpeed: null, freeFlowSpeed: 90 })).toBeNull()
    expect(speedPercent({ currentSpeed: 10, freeFlowSpeed: 0 })).toBeNull()
  })
})

describe('worstStatus', () => {
  it('toma el peor tramo con datos', () => {
    expect(worstStatus([{ status: 'FLUIDO' }, { status: 'CONGESTIONADO' }])).toBe('CONGESTIONADO')
    expect(worstStatus([{ status: 'SIN_DATOS' }, { status: 'DEMORADO' }])).toBe('DEMORADO')
    expect(worstStatus([{ status: 'SIN_DATOS' }])).toBe('SIN_DATOS')
  })
})

describe('lengthKm y delayMinutes', () => {
  // Unos 11 km de norte a sur.
  const geometry = [
    [-34.5, -58.5],
    [-34.6, -58.5],
  ]

  it('mide el tramo y calcula la demora', () => {
    expect(lengthKm(geometry)).toBeCloseTo(11.1, 1)
    // 11,1 km a 35 en vez de 103 km/h: 19 minutos en vez de 6,5.
    expect(delayMinutes({ currentSpeed: 35, freeFlowSpeed: 103, geometry })).toBe(13)
  })

  it('sin demora o sin datos no hay numero', () => {
    expect(delayMinutes({ currentSpeed: 100, freeFlowSpeed: 100, geometry })).toBeNull()
    expect(delayMinutes({ currentSpeed: 35, freeFlowSpeed: 103, geometry: [] })).toBeNull()
  })
})

describe('speedText', () => {
  it('no repite la velocidad si es la normal', () => {
    expect(speedText({ currentSpeed: 104, freeFlowSpeed: 104 })).toBe('104 km/h, velocidad normal')
    expect(speedText({ currentSpeed: 58, freeFlowSpeed: 92 })).toBe('58 km/h · normal 92 km/h')
    expect(speedText({ currentSpeed: null })).toBe('Sin medición en este momento.')
  })
})

describe('trafficProblems', () => {
  it('junta las manos con problemas, la peor primero', () => {
    const accesses = [
      {
        id: 'oeste',
        segments: [
          {
            name: 'General Paz - Moreno',
            directions: [
              { towards: 'CABA', status: 'FLUIDO' },
              { towards: 'Provincia', status: 'DEMORADO', currentSpeed: 58, freeFlowSpeed: 92 },
            ],
          },
        ],
      },
      {
        id: 'norte',
        segments: [{ name: 'Ramal Pilar', status: 'CONGESTIONADO', currentSpeed: 20, freeFlowSpeed: 90 }],
      },
    ]
    const problems = trafficProblems(accesses)
    expect(problems.map((p) => p.status)).toEqual(['CONGESTIONADO', 'DEMORADO'])
    expect(problems[1]).toMatchObject({ segment: 'General Paz - Moreno', towards: 'Provincia' })
    expect(trafficProblems([{ id: 'x', segments: [{ name: 'a', status: 'FLUIDO' }] }])).toEqual([])
  })
})

describe('problemsTitle', () => {
  const p = (id, status) => ({ access: { id }, status })

  it('cuenta los cortes solo en los accesos cortados y el resto como demoras', () => {
    const problems = [p('ezeiza', 'CORTADO'), p('ezeiza', 'CORTADO'), p('norte', 'CONGESTIONADO'), p('oeste', 'DEMORADO')]
    expect(problemsTitle(problems)).toBe('Hay cortes en 1 acceso y demoras en 2 más')
  })

  it('sin cortes, habla de demoras; con todo cortado, solo de cortes', () => {
    expect(problemsTitle([p('norte', 'CONGESTIONADO'), p('norte', 'DEMORADO')])).toBe('Hay demoras en 1 acceso')
    expect(problemsTitle([p('a', 'CORTADO'), p('b', 'CORTADO')])).toBe('Hay cortes en 2 accesos')
    expect(problemsTitle([p('a', 'CORTADO'), p('a', 'DEMORADO')])).toBe('Hay cortes en 1 acceso')
    expect(problemsTitle([])).toBeNull()
  })
})

describe('accessShortName y accessGroups', () => {
  const access = (id, name, ...statuses) => ({
    id,
    name,
    segments: statuses.map((status, i) => ({ name: `Autopista Tramo ${i + 1}`, status })),
  })

  it('acorta el nombre del acceso', () => {
    expect(accessShortName({ name: 'Acceso Norte (Panamericana)' })).toBe('Acceso Norte')
    expect(accessShortName({ name: 'Autopista Buenos Aires - La Plata' })).toBe('Buenos Aires - La Plata')
    expect(accessShortName({ name: 'Riccheri / Ezeiza-Cañuelas' }, { name: 'Autopista Ezeiza–Cañuelas' })).toBe(
      'Ezeiza–Cañuelas',
    )
  })

  it('agrupa por el peor estado de cada acceso y deja afuera los fluidos', () => {
    const groups = accessGroups([
      access('la-plata', 'Autopista Buenos Aires - La Plata', 'FLUIDO', 'FLUIDO'),
      access('norte', 'Acceso Norte (Panamericana)', 'FLUIDO', 'CONGESTIONADO'),
      access('oeste', 'Acceso Oeste', 'DEMORADO'),
      access('riccheri', 'Riccheri / Ezeiza-Cañuelas', 'FLUIDO', 'CORTADO'),
    ])
    expect(groups.map((g) => [g.label, g.tone, g.names])).toEqual([
      ['Cortes', 'interrupted', ['Tramo 2']],
      ['Congestión', 'interrupted', ['Acceso Norte']],
      ['Demoras', 'delayed', ['Acceso Oeste']],
    ])
  })

  it('sin problemas o sin datos no hay grupos', () => {
    expect(accessGroups([access('oeste', 'Acceso Oeste', 'FLUIDO')])).toEqual([])
    expect(accessGroups([access('oeste', 'Acceso Oeste')])).toEqual([])
    expect(accessGroups(undefined)).toEqual([])
  })
})
